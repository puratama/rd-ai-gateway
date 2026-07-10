import { NextRequest, NextResponse } from "next/server";

const PUTER_API = "https://api.puter.com/puterai/openai/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model } = body;

    if (!messages || !model) {
      return NextResponse.json(
        { error: "messages and model are required" },
        { status: 400 }
      );
    }

    const puterToken = process.env.PUTER_AUTH_TOKEN;
    if (!puterToken || puterToken === "your-puter-auth-token-here") {
      return NextResponse.json(
        { error: "Puter auth token not configured. Set PUTER_AUTH_TOKEN in .env.local" },
        { status: 500 }
      );
    }

    const response = await fetch(PUTER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${puterToken}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Puter API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
