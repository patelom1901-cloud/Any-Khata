/**
 * Cloudinary image optimization utilities.
 * Inserts Cloudinary transformation params into the image URL
 * so the CDN serves a resized, auto-format, auto-quality image
 * instead of the original full-resolution file.
 */

/**
 * Returns a Cloudinary transformation URL for the given image URL.
 * - Resizes to `width` pixels (proportional height)
 * - q_auto: automatic quality selection by Cloudinary
 * - f_auto: serves WebP/AVIF when the client supports it
 *
 * @param originalUrl - The raw Cloudinary secure_url stored in the DB
 * @param width       - Max display width in logical pixels (default 800)
 * @returns Transformed URL, or null if the input is null/undefined/non-Cloudinary
 */
export function getOptimizedImageUrl(
  originalUrl: string | null | undefined,
  width: number = 800
): string | null {
  if (!originalUrl) return null;
  if (!originalUrl.includes('res.cloudinary.com')) return originalUrl;

  // Insert transformation params after /upload/
  return originalUrl.replace(
    '/upload/',
    `/upload/w_${width},q_auto,f_auto/`
  );
}
