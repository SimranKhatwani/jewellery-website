import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { getGridFSBucket } from '../config/db.js';
import { authenticateAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

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
 */
router.post(
  '/',
  authenticateAdmin,
  upload.single('image'),
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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

      // Create upload stream to GridFS
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          contentType: req.file.mimetype,
          sizeBytes: req.file.size,
          uploadedBy: req.admin?.email || 'admin',
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
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

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
 */
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

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
