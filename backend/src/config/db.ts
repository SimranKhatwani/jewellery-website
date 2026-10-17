import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let gridFSBucket: GridFSBucket | null = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aurelle';
  
  try {
    const conn = await mongoose.connect(uri);
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
