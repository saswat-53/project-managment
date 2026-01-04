import mongoose from "mongoose";

/**
 * Check if MongoDB transactions should be used.
 * Transactions require a MongoDB replica set.
 *
 * @returns true if transactions should be used, false otherwise
 */
export const useTransactions = (): boolean => {
  // Only use transactions in production with replica set
  return (
    process.env.NODE_ENV === "production" &&
    process.env.MONGODB_REPLICA_SET === "true"
  );
};

/**
 * Execute a callback function within a MongoDB transaction.
 * If transactions are not available (development without replica set),
 * the callback is executed without a transaction.
 *
 * @param callback Function to execute within transaction
 * @returns Result of the callback function
 * @throws Error if transaction fails
 */
export const withTransaction = async <T>(
  callback: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> => {
  if (!useTransactions()) {
    // In development without replica set, run without transactions
    console.log(
      "[Transaction] Running without transaction (dev mode or no replica set)"
    );
    return callback(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
