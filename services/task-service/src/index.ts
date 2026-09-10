import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI as string;

const startServer = async () => {
  try {
    const connection = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected to ${connection.connection.host}`);

    app.listen(PORT, () => {
      console.log(`Task Service running on ${PORT}`);
    });
  } catch (error: any) {
    console.error(`Failed to connect MongoDB: ${error?.message || error}`);
    process.exit(1);
  }
};

startServer();