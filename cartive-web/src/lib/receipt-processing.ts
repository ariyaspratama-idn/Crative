import sharp from "sharp";

export class ReceiptImageError extends Error {
  constructor() {
    super("Foto struk tidak terbaca. Coba foto ulang dengan cahaya cukup.");
    this.name = "ReceiptImageError";
  }
}

const supportedFormats = new Set(["jpeg", "png", "webp", "heif"]);

export async function processReceiptImage(input: Buffer) {
  try {
    const metadata = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
    if (!metadata.format || !supportedFormats.has(metadata.format)) {
      throw new ReceiptImageError();
    }

    return await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (error) {
    if (error instanceof ReceiptImageError) throw error;
    throw new ReceiptImageError();
  }
}
