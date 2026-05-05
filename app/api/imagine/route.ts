import { NextResponse } from "next/server";
import { checkPerIpLimit } from "@/lib/rateLimit";

interface ImagineRequestBody {
  prompt: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Image generation is not configured." },
      { status: 503 }
    );
  }

  // Per-IP rate limit
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipCheck = await checkPerIpLimit(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limited. Try again later." },
      { status: 429 }
    );
  }

  let body: ImagineRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.prompt || typeof body.prompt !== "string") {
    return NextResponse.json(
      { error: "prompt is required." },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-image",
        prompt: body.prompt,
        n: 1,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("[imagine] upstream error:", upstream.status, text);
      return NextResponse.json(
        { error: `Image generation failed (${upstream.status}).` },
        { status: upstream.status >= 500 ? 502 : upstream.status }
      );
    }

    const data = (await upstream.json()) as {
      data?: Array<{ url?: string }>;
    };

    const url = data?.data?.[0]?.url;
    if (!url) {
      return NextResponse.json(
        { error: "No image returned." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[imagine] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
