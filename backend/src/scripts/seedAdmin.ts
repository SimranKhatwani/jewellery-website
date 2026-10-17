import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin.js';
import { connectDB } from '../config/db.js';

dotenv.config();

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@aurelle.com').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'AurelleAdmin2026!';
  const name = process.env.ADMIN_NAME || 'AURELLE Administrator';

  console.log('--- AURELLE Admin Seeding ---');
  console.log(`Target Email: ${email}`);

  try {
    await connectDB();

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log(`[INFO] Admin user '${email}' already exists.`);
      console.log('To change the password, update it in your database or reset via script.');
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newAdmin = await Admin.create({
        email,
        passwordHash,
        name,
        role: 'superadmin',
      });

      console.log(`[SUCCESS] Admin user created successfully:`);
      console.log(`  - ID: ${newAdmin._id}`);
      console.log(`  - Name: ${newAdmin.name}`);
      console.log(`  - Email: ${newAdmin.email}`);
      console.log(`  - Role: ${newAdmin.role}`);
      console.log(`  - Temporary Default Password: ${password}`);
      console.log(`[NOTE] Please change your password after initial login!`);
    }
  } catch (error: any) {
    console.error('[ERROR] Failed to seed admin user:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('[INFO] Database connection closed.');
  }
}

seedAdmin();
