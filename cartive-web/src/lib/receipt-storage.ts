import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConfigurationError } from "@/lib/security";

export class StorageError extends Error {
  constructor(message = "Foto belum dapat disimpan dengan aman. Coba lagi nanti.") {
    super(message);
    this.name = "StorageError";
  }
}

function getStorageConfig() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new ConfigurationError(
      "Penyimpanan struk privat belum dikonfigurasi.",
    );
  }

  return { endpoint: S3_ENDPOINT, bucket: S3_BUCKET, accessKey: S3_ACCESS_KEY, secretKey: S3_SECRET_KEY };
}

function createStorageClient(endpoint: string, accessKey: string, secretKey: string) {
  return new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });
}

export async function storePrivateReceipt(key: string, body: Buffer) {
  const config = getStorageConfig();
  const client = createStorageClient(config.endpoint, config.accessKey, config.secretKey);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "private, no-store",
        Metadata: { retention: "30-days" },
      }),
    );
    return { bucket: config.bucket, client };
  } catch {
    client.destroy();
    throw new StorageError();
  }
}

export async function readPrivateReceipt(key: string) {
  const config = getStorageConfig();
  const client = createStorageClient(config.endpoint, config.accessKey, config.secretKey);
  try {
    const result = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    );
    if (!result.Body) throw new StorageError("Foto struk tidak tersedia.");
    const body = Buffer.from(await result.Body.transformToByteArray());
    return { body, client };
  } catch {
    client.destroy();
    throw new StorageError("Foto struk belum dapat ditampilkan dengan aman.");
  }
}

export async function deletePrivateReceipt(
  client: S3Client,
  bucket: string,
  key: string,
) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  client.destroy();
}

export async function deleteStoredReceipt(key: string) {
  const config = getStorageConfig();
  const client = createStorageClient(config.endpoint, config.accessKey, config.secretKey);
  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
  } catch {
    throw new StorageError("Foto struk belum dapat dihapus.");
  } finally {
    client.destroy();
  }
}

export function disposeStorageClient(client: S3Client) {
  client.destroy();
}
