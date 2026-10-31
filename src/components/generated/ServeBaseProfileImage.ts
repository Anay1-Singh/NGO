export const MAX_PROFILE_PHOTO_LENGTH = 96_000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Only small, embedded raster images are allowed in the local directory. */
export function isProfilePhoto(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_PROFILE_PHOTO_LENGTH) return false;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const prefix = atob(match[2].slice(0, 32));
    return match[1] === "jpeg"
      ? prefix.startsWith("\xff\xd8\xff")
      : match[1] === "png"
        ? prefix.startsWith("\x89PNG\r\n\x1a\n")
        : prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WEBP";
  } catch { return false; }
}

export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP image.");
  if (!file.size || file.size > MAX_UPLOAD_BYTES)
    throw new Error("Choose an image smaller than 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); }
    catch { throw new Error("This image could not be read. Try another JPG, PNG, or WebP file."); }
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height || width > 8192 || height > 8192 || width * height > 20_000_000)
      throw new Error("Use an image up to 8,192 pixels per side and 20 megapixels.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable in this browser.");
    context.fillStyle = "#e9e3d9";
    context.fillRect(0, 0, 256, 256);
    const side = Math.min(width, height);
    context.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, 256, 256);
    for (const quality of [.86, .72, .55]) {
      const photo = canvas.toDataURL("image/jpeg", quality);
      if (isProfilePhoto(photo)) return photo;
    }
    throw new Error("This photo is too detailed to save. Try a smaller or simpler image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
