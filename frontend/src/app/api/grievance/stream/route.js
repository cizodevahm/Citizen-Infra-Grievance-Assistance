export const dynamic = "force-dynamic";

// In-memory list of listeners for real-time broadcast
const clients = new Set();

export async function GET(request) {
  const encoder = new TextEncoder();

  let clientController = null;

  const stream = new ReadableStream({
    start(controller) {
      clientController = controller;
      clients.add(controller);

      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: new Date().toISOString() })}\n\n`)
      );

      // Keepalive heartbeat
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
          clients.delete(controller);
        }
      }, 12000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        clients.delete(controller);
      });
    },
    cancel() {
      if (clientController) {
        clients.delete(clientController);
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// POST endpoint to broadcast a new complaint into the live SSE stream
export async function POST(request) {
  try {
    const body = await request.json();
    const encoder = new TextEncoder();
    const message = `event: new_complaint\ndata: ${JSON.stringify(body)}\n\n`;

    for (const client of clients) {
      try {
        client.enqueue(encoder.encode(message));
      } catch {
        clients.delete(client);
      }
    }

    return Response.json({ success: true, broadcastCount: clients.size });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 400 });
  }
}
