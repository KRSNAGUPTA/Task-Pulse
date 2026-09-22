import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { closeRedis, redisClient } from "./config/redis.config.js";
import { Task } from "./models/task.model.js";

const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI;

const startServer = async () => {
  if (!MONGO_URI) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }

  try {
    const connection = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected to ${connection.connection.host}`);

    await Task.syncIndexes(); // to sync index

    await redisClient(); // redis-optional

    const server = app.listen(PORT, () => {
      console.log(`Task Service running on ${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received, shutting down`);
      server.close(async () => {
        await Promise.allSettled([mongoose.disconnect(), closeRedis()]);
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on("SIGTERM", () => void shutdown("SIGTERM")); // Signal Terminate
    process.on("SIGINT", () => void shutdown("SIGINT")); // signal Interrupt -> to close db
  } catch (error: any) {
    console.error(`Failed to start: ${error?.message || error}`);
    process.exit(1);
  }
};

startServer();