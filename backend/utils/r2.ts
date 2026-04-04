import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 is S3-compatible — use the AWS SDK with Cloudflare's endpoint
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * Generates a presigned PUT URL the browser can use to upload directly to R2.
 * Expires in 5 minutes — enough time for the user to upload.
 */
export const generatePresignedUploadUrl = async (
  key: string,
  contentType: string
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: 300 });
};

/**
 * Deletes an object from R2 by key.
 */
export const deleteR2Object = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  await r2Client.send(command);
};

/**
 * Returns the permanent public URL for a stored object.
 * Requires R2_PUBLIC_URL to be set (e.g. https://pub-xxxx.r2.dev).
 */
export const getPublicUrl = (key: string): string => {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
};
