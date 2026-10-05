import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const imageFile = formData.get("image");
    const voiceNoteFile = formData.get("voiceNote");
    const textNote = formData.get("textNote");
    const latitude = formData.get("latitude");
    const longitude = formData.get("longitude");
    const locationSource = formData.get("locationSource");
    const submittedAt = formData.get("submittedAt") || new Date().toISOString();

    // 1. Validation: Image is required
    if (!imageFile || typeof imageFile === "string") {
      return NextResponse.json(
        { error: "Infrastructure issue image is required." },
        { status: 400 }
      );
    }

    // 2. Validation: Image size limit (10 MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (imageFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Image file exceeds the maximum allowed size of 10 MB." },
        { status: 400 }
      );
    }

    // 3. Validation: Location coordinates are required
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Location coordinates (latitude and longitude) are required." },
        { status: 400 }
      );
    }

    // Generate unique ticket reference
    const ticketId = `CIGA-${Date.now().toString().slice(-6)}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    console.log("=== Grievance Received ===");
    console.log("Ticket ID:", ticketId);
    console.log("Image:", imageFile.name, `(${imageFile.size} bytes)`);
    console.log(
      "Voice Note:",
      voiceNoteFile ? `${voiceNoteFile.name} (${voiceNoteFile.size} bytes)` : "None"
    );
    console.log("Text Note:", textNote || "None");
    console.log(`Coordinates: Lat ${latitude}, Lng ${longitude} (Source: ${locationSource})`);
    console.log("Submitted At:", submittedAt);

    return NextResponse.json(
      {
        success: true,
        message: "Grievance successfully recorded.",
        ticketId,
        data: {
          image: {
            name: imageFile.name,
            size: imageFile.size,
            type: imageFile.type,
          },
          voiceNote: voiceNoteFile
            ? {
                name: voiceNoteFile.name,
                size: voiceNoteFile.size,
                type: voiceNoteFile.type,
              }
            : null,
          textNote: textNote || null,
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            source: locationSource,
          },
          submittedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Grievance submission API error:", error);
    return NextResponse.json(
      { error: "Internal server error processing grievance report." },
      { status: 500 }
    );
  }
}
