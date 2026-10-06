import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const incomingFormData = await request.formData();

    const image = incomingFormData.get("image");
    const lat = incomingFormData.get("lat") || incomingFormData.get("latitude");
    const lng =
      incomingFormData.get("lng") || incomingFormData.get("longitude");
    const text =
      incomingFormData.get("text") || incomingFormData.get("textNote");
    const audio =
      incomingFormData.get("audio") || incomingFormData.get("voiceNote");

    // Validation
    if (!image || typeof image === "string") {
      return NextResponse.json(
        { success: false, error: "Infrastructure issue image is required." },
        { status: 400 },
      );
    }

    if (!lat || !lng) {
      return NextResponse.json(
        {
          success: false,
          error: "Location coordinates (latitude and longitude) are required.",
        },
        { status: 400 },
      );
    }

    const apiUrl = process.env.COMPLAINTS_API_URL;
    const apiKey = process.env.COMPLAINTS_API_KEY;

    // Prepare outbound FormData
    const outboundFormData = new FormData();
    outboundFormData.append("image", image);
    outboundFormData.append("lat", lat.toString());
    outboundFormData.append("lng", lng.toString());

    if (text && typeof text === "string" && text.trim()) {
      outboundFormData.append("text", text.trim());
    }

    if (audio && typeof audio !== "string") {
      outboundFormData.append("audio", audio);
    }

    const backendResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
      },
      body: outboundFormData,
    });

    const responseData = await backendResponse.json().catch(() => null);

    if (backendResponse.ok && responseData?.success) {
      return NextResponse.json(responseData, { status: 201 });
    }

    const errorMessage =
      responseData?.error?.message ||
      responseData?.error ||
      responseData?.message ||
      `Server responded with status ${backendResponse.status}`;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: responseData,
      },
      { status: backendResponse.status || 400 },
    );
  } catch (error) {
    console.error("Grievance submission API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "Internal server error processing grievance report.",
      },
      { status: 500 },
    );
  }
}
