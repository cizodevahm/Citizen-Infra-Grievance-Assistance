import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and password are required.",
          },
        },
        { status: 400 },
      );
    }

    const backendBaseUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:5000";

    const backendResponse = await fetch(`${backendBaseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: String(body.email).trim(),
        password: String(body.password),
      }),
    });

    const responseData = await backendResponse.json().catch(() => null);

    return NextResponse.json(
      responseData || {
        success: false,
        data: null,
        error: {
          code: "SERVER_ERROR",
          message: `Server responded with status ${backendResponse.status}`,
        },
      },
      { status: backendResponse.status },
    );
  } catch (error) {
    console.error("Auth login proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to authenticate with backend server.",
        },
      },
      { status: 500 },
    );
  }
}
