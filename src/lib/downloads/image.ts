import "server-only";
import sharp from "sharp";

export async function convertPhotoToJpeg(bytes: Uint8Array) {
  return await sharp(bytes).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
}
