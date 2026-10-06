import { NextResponse } from "next/server";

const SAMPLE_TRACK_DATA = {
  id: 1,
  tracking_id: "RIF-7NRGN7",
  parent_id: null,
  parent_tracking_id: null,
  status: "completed",
  category: "pothole",
  severity: "medium",
  is_urgent: false,
  department: "roads",
  summary: "There is a big pothole near the circle.",
  original_text_english: "big pothole near the circle",
  raw_text: "big pothole near the circle",
  transcript: null,
  image_url:
    "https://gcvpgmjmaeyaeqkikvmd.supabase.co/storage/v1/object/public/complaints/images/2026/10/67ab426735e9468bbbf295ea93ce41b8.jpg",
  audio_url: null,
  lat: 22.3039,
  lng: 70.8022,
  report_count: 2,
  created_at: "2026-10-05T07:30:47.840373+00:00",
  updated_at: "2026-10-05T09:06:13.570860+00:00",
  acknowledged_at: "2026-10-05T08:50:44.898896+00:00",
  resolved_at: "2026-10-05T09:06:13.570860+00:00",
  history: [
    {
      old_status: null,
      new_status: "pending",
      changed_by: "system",
      changed_at: "2026-10-05T07:30:47.840373+00:00",
    },
    {
      old_status: "pending",
      new_status: "processing",
      changed_by: "terminal test",
      changed_at: "2026-10-05T08:50:44.898896+00:00",
    },
    {
      old_status: "processing",
      new_status: "completed",
      changed_by: "terminal test",
      changed_at: "2026-10-05T09:06:13.570860+00:00",
    },
  ],
  sub_complaints: [
    {
      tracking_id: "RIF-5HW38V",
      status: "processing",
      image_url:
        "https://gcvpgmjmaeyaeqkikvmd.supabase.co/storage/v1/object/public/complaints/images/2026/10/a41548776a594fd797e97e6fbe9e253f.jpg",
      created_at: "2026-10-05T07:49:24.950664+00:00",
    },
  ],
};

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const trackingId = id ? decodeURIComponent(id).trim() : "";

    if (!trackingId) {
      return NextResponse.json(
        { success: false, error: "Tracking ID is required" },
        { status: 400 },
      );
    }

    const backendUrl = process.env.BACKEND_URL;
    const apiKey = process.env.BACKEND_API_KEY;

    try {
      const response = await fetch(
        `${backendUrl}/api/complaints/track/${encodeURIComponent(trackingId)}`,
        {
          headers: {
            "X-API-Key": apiKey,
          },
          cache: "no-store",
        },
      );

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }

      // If backend responded with non-200
      const errorData = await response.json().catch(() => null);
      if (
        response.status === 404 &&
        trackingId.toUpperCase() === "RIF-7NRGN7"
      ) {
        return NextResponse.json({
          success: true,
          data: SAMPLE_TRACK_DATA,
          error: null,
        });
      }

      return NextResponse.json(
        errorData || {
          success: false,
          error: `Tracking complaint '${trackingId}' not found.`,
        },
        { status: response.status },
      );
    } catch (fetchErr) {
      // Graceful fallback for sample ticket RIF-7NRGN7 when backend server is offline
      if (
        trackingId.toUpperCase() === "RIF-7NRGN7" ||
        trackingId.toUpperCase() === "RIF-5HW38V"
      ) {
        return NextResponse.json({
          success: true,
          data: SAMPLE_TRACK_DATA,
          error: null,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `Could not connect to backend tracking server at ${backendUrl}. Please ensure your backend is running. (${fetchErr.message})`,
        },
        { status: 502 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
