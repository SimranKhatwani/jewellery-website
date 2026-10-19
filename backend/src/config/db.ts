import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import dns from 'dns';

// Reliable DNS resolution for MongoDB Atlas SRV connection strings (_mongodb._tcp)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // ignore if restricted
}

let gridFSBucket: GridFSBucket | null = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aurelle';
  const dbName = process.env.MONGODB_DB_NAME || 'aurelle';
  
  try {
    const conn = await mongoose.connect(uri, {
      dbName: dbName,
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    
    if (conn.connection.db) {
      gridFSBucket = new GridFSBucket(conn.connection.db, {
        bucketName: 'media',
      });
      console.log(`[Database] GridFS Bucket 'media' initialized successfully.`);
    }

    return conn;
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    throw error;
  }
};

export const getGridFSBucket = (): GridFSBucket => {
  if (!gridFSBucket) {
    if (mongoose.connection.db) {
      gridFSBucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'media',
      });
      return gridFSBucket;
    }
    throw new Error('Database not connected. GridFSBucket is unavailable.');
  }
  return gridFSBucket;
};
