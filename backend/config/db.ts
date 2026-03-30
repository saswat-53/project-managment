import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!, {
      bufferCommands: false, // fail fast instead of silently queuing queries during disconnect
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// Monitor connection health after initial connect
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected — queries will fail until reconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB runtime error:", err);
});
