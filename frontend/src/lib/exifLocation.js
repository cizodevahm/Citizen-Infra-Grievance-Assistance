import exifr from "exifr";

/**
 * Extracts GPS coordinates and camera metadata from an image File or Blob.
 * Supports standard EXIF, XMP, and TIFF tags.
 * Returns detailed diagnostic information so users know why GPS was or wasn't found.
 */
export async function extractLocationFromImage(file) {
  if (!file) return { success: false, reason: "NO_FILE", message: "No image file provided." };

  try {
    const arrayBuffer = await file.arrayBuffer();

    // 1. First attempt: Direct exifr GPS extraction
    let gps = await exifr.gps(arrayBuffer);
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number") {
      return {
        success: true,
        latitude: Number(gps.latitude.toFixed(6)),
        longitude: Number(gps.longitude.toFixed(6)),
        source: "image_exif",
        cameraInfo: null,
      };
    }

    // 2. Second attempt: Full parse with XMP, TIFF and GPS flags
    const allMeta = await exifr.parse(arrayBuffer, {
      tiff: true,
      xmp: true,
      exif: true,
      gps: true,
      mergeOutput: true,
    });

    if (allMeta) {
      const lat = allMeta.latitude ?? allMeta.GPSLatitude;
      const lng = allMeta.longitude ?? allMeta.GPSLongitude;

      if (typeof lat === "number" && typeof lng === "number") {
        return {
          success: true,
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          source: "image_exif",
          cameraInfo: [allMeta.Make, allMeta.Model].filter(Boolean).join(" "),
        };
      }

      // Check if camera metadata exists (camera model, creation date) without GPS
      const cameraInfo = [allMeta.Make, allMeta.Model].filter(Boolean).join(" ");
      if (cameraInfo || allMeta.DateTimeOriginal) {
        return {
          success: false,
          reason: "CAMERA_WITHOUT_GPS",
          cameraInfo: cameraInfo || "Device Camera",
          message: `Camera metadata was detected (${cameraInfo || "Camera"}), but GPS location tags were disabled in your camera settings when this photo was taken.`,
        };
      }
    }

    // If completely absent
    const isPng = file.type === "image/png" || file.name?.toLowerCase().endsWith(".png");
    return {
      success: false,
      reason: "NO_EXIF",
      message: isPng
        ? "This PNG file contains no GPS metadata. Screenshots and web-saved PNGs do not have location tags. Please upload an original JPEG/HEIC camera photo with GPS enabled, or click 'Use My GPS'."
        : "No GPS tags found in this photo. (Note: WhatsApp, Telegram, Facebook, and screenshots strip GPS tags for privacy). Use an original camera photo or click 'Use My GPS'.",
    };
  } catch (err) {
    console.warn("EXIF extraction error:", err);
    return {
      success: false,
      reason: "ERROR",
      message: "Could not read image EXIF data. Please use browser GPS or enter coordinates manually.",
    };
  }
}
