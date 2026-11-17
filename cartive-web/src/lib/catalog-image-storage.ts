import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ConfigurationError } from "@/lib/security";

function createCatalogStorageClient() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new ConfigurationError("Penyimpanan gambar katalog belum dikonfigurasi.");
  }
  return {
    bucket: S3_BUCKET,
    client: new S3Client({
      endpoint: S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
      credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    }),
  };
}

export async function storeCatalogImage(key: string, body: Buffer) {
  const { bucket, client } = createCatalogStorageClient();
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    }));
  } finally {
    client.destroy();
  }
}

export async function readCatalogImage(key: string) {
  const { bucket, client } = createCatalogStorageClient();
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) throw new Error("Gambar katalog tidak ditemukan di penyimpanan.");
    return Buffer.from(await result.Body.transformToByteArray());
  } finally {
    client.destroy();
  }
}

export async function deleteCatalogImage(key: string) {
  const { bucket, client } = createCatalogStorageClient();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } finally {
    client.destroy();
  }
}
