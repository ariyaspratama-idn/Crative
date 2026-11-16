import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processReceiptImage, ReceiptImageError } from "./receipt-processing";

describe("processReceiptImage", () => {
  it("mengubah foto JPEG menjadi WEBP yang ukurannya dibatasi", async () => {
    const input = await sharp({
      create: {
        width: 1400,
        height: 900,
        channels: 3,
        background: "#ffffff",
      },
    })
      .jpeg()
      .toBuffer();

    const output = await processReceiptImage(input);
    const metadata = await sharp(output).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1280);
    expect(metadata.height).toBeLessThanOrEqual(1280);
  });

  it("menolak data yang bukan gambar", async () => {
    await expect(processReceiptImage(Buffer.from("bukan gambar"))).rejects.toBeInstanceOf(
      ReceiptImageError,
    );
  });
});
