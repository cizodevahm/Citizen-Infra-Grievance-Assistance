import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const incomingFormData = await request.formData();

    const image = incomingFormData.get("image");
    const lat =
      incomingFormData.get("lat") || incomingFormData.get("latitude");
    const lng =
      incomingFormData.get("lng") || incomingFormData.get("longitude");
    const text =
      incomingFormData.get("text") || incomingFormData.get("textNote");
    const audio =
      incomingFormData.get("audio") || incomingFormData.get("voiceNote");

    // Compulsory field validation: image and location (lat, lng)
    if (!image || typeof image === "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Infrastructure issue photo is compulsory.",
        },
        { status: 400 }
      );
    }

    if (!lat || !lng) {
      return NextResponse.json(
        {
          success: false,
          error: "Incident location coordinates (lat and lng) are compulsory.",
        },
        { status: 400 }
      );
    }

    const apiUrl =
      process.env.COMPLAINTS_API_URL ||
      "https://test-ciga-ai.onrender.com/api/complaints";
    const apiKey =
      process.env.COMPLAINTS_API_KEY ||
      "e5q2V2sJkkdEQUXe_-ETzy3UjrQreotz8QrT5gcHqKU";

    // Prepare outbound FormData matching backend expectations
    const outboundFormData = new FormData();
    outboundFormData.append("image", image);
    outboundFormData.append("lat", lat.toString());
    outboundFormData.append("lng", lng.toString());

    // Optional fields: text and audio
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

    // Backend returned an error response
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
      { status: backendResponse.status || 400 }
    );
  } catch (error) {
    console.error("Complaints submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to submit grievance to the server.",
      },
      { status: 500 }
    );
  }
}
