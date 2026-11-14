import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { getGridFSBucket } from '../config/db.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { Tenant } from '../models/Tenant.js';
import { TenantMembership } from '../models/TenantMembership.js';
import { User } from '../models/User.js';
import { MEMBERSHIP_STATUS } from '../config/constants.js';

const router = Router();

/**
 * Middleware to resolve tenant for legacy media upload
 */
const resolveMediaTenant = async (req, _res, next) => {
  try {
    if (req.tenant) return next();

    const rawId = req.headers['x-tenant-id'] || req.headers['x-store-slug'] || req.query.tenantId;
    let tenant = null;

    if (rawId) {
      const id = String(rawId).trim();
      if (mongoose.Types.ObjectId.isValid(id)) {
        tenant = await Tenant.findById(id);
      } else {
        tenant = await Tenant.findOne({ slug: id.toLowerCase() });
      }
    }

    if (!tenant) {
      tenant = (await Tenant.findOne({ slug: 'aurelle' })) || (await Tenant.findOne({ status: 'active' }));
    }

    if (tenant) {
      req.tenant = tenant;
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies active membership in req.tenant before media write
 */
const authorizeMediaTenant = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ success: false, message: 'Tenant store context required.' });
    }

    let user = req.user;
    if (!user && req.admin) {
      const userId = req.admin.userId || req.admin.id;
      if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
        user = await User.findById(userId);
      }
      if (!user && req.admin.email) {
        user = await User.findOne({ email: String(req.admin.email).toLowerCase().trim() });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Admin user identity could not be verified.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: `Account is ${user.status}. Access denied.` });
    }

    if (user.isSuperAdmin) {
      req.user = user;
      return next();
    }

    const membership = await TenantMembership.findOne({
      tenantId: req.tenant._id,
      userId: user._id,
    });

    if (!membership || membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You do not have an active membership for store '${req.tenant.name}'.`,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Configure Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB image size limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed.'));
    }
  },
});

/**
 * POST /api/media
 * Protected endpoint for uploading image binary directly into MongoDB GridFS
 * Scoped to authenticated admin's tenant
 */
router.post(
  '/',
  authenticateAdmin,
  resolveMediaTenant,
  authorizeMediaTenant,
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No image file provided in request.',
        });
        return;
      }

      const bucket = getGridFSBucket();
      const filename = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Create upload stream to GridFS with tenantId in metadata
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
        metadata: {
          tenantId: req.tenant._id,
          originalName: req.file.originalname,
          contentType: req.file.mimetype,
          sizeBytes: req.file.size,
          uploadedBy: req.user?.email || req.admin?.email || 'admin',
          uploadedAt: new Date(),
        },
      });

      const readableStream = new Readable();
      readableStream.push(req.file.buffer);
      readableStream.push(null);

      readableStream
        .pipe(uploadStream)
        .on('error', (err) => {
          console.error('[Media] GridFS upload stream error:', err);
          res.status(500).json({
            success: false,
            message: 'Failed to write media binary to database storage.',
          });
        })
        .on('finish', () => {
          const fileId = uploadStream.id.toString();
          const mediaUrl = `/api/media/${fileId}`;

          res.status(201).json({
            success: true,
            id: fileId,
            url: mediaUrl,
            filename,
            contentType: req.file?.mimetype,
            sizeBytes: req.file?.size,
          });
        });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/media/:id
 * Public endpoint to stream image binary from MongoDB GridFS with caching
 */
router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid media ID format.',
      });
      return;
    }

    const bucket = getGridFSBucket();
    const objectId = new ObjectId(id);

    // Look up file metadata first
    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Media asset not found in storage.',
      });
      return;
    }

    const file = files[0];
    const contentType = file.metadata?.contentType || file.contentType || 'image/jpeg';

    // Set proper headers with browser caching (1 day cache, stale-while-revalidate 7 days)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', file.length);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('ETag', `"${file._id.toString()}"`);

    // Stream download from GridFS
    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on('error', (err) => {
      console.error('[Media] GridFS download stream error:', err);
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          message: 'Error streaming requested media asset.',
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/media/:id
 * Protected endpoint to delete an image binary from GridFS
 * Enforces strict tenant ownership: Admins can only delete their own store's media
 */
router.delete('/:id', authenticateAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid media ID format.',
      });
      return;
    }

    const bucket = getGridFSBucket();
    const objectId = new ObjectId(id);

    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Media asset not found in database.',
      });
      return;
    }

    const file = files[0];
    const fileTenantId = file.metadata?.tenantId;

    // Resolve admin user
    let user = req.user;
    if (!user && req.admin) {
      const uId = req.admin.userId || req.admin.id;
      if (uId && mongoose.Types.ObjectId.isValid(String(uId))) {
        user = await User.findById(uId);
      }
      if (!user && req.admin.email) {
        user = await User.findOne({ email: String(req.admin.email).toLowerCase().trim() });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Admin user identity could not be verified.',
      });
    }

    // Super Admin has universal oversight
    if (!user.isSuperAdmin) {
      if (fileTenantId) {
        const membership = await TenantMembership.findOne({
          tenantId: fileTenantId,
          userId: user._id,
          status: MEMBERSHIP_STATUS.ACTIVE,
        });

        if (!membership) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not have permission to delete media belonging to another store.',
          });
        }
      } else {
        // Safe compatibility policy for legacy media without tenant metadata:
        // Restricted to Super Admin or verified primary 'aurelle' store admin
        const aurelleTenant = await Tenant.findOne({ slug: 'aurelle' });
        const membership = aurelleTenant
          ? await TenantMembership.findOne({
              tenantId: aurelleTenant._id,
              userId: user._id,
              status: MEMBERSHIP_STATUS.ACTIVE,
            })
          : null;

        if (!membership) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Deleting legacy platform media requires platform superadmin or primary store privileges.',
          });
        }
      }
    }

    await bucket.delete(objectId);

    res.json({
      success: true,
      message: 'Media asset successfully removed from database storage.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

