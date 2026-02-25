import { NextRequest, NextResponse } from "next/server";
import { assertSafeTarget, assertSupportedUrl } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_MARKDOWN_CHARS = 50_000;
const FETCH_TIMEOUT_MS = 10_000;

type RequestBody = {
  url?: string;
  userAgent?: string;
};

type HeaderRecord = Record<string, string>;

function getIpFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return realIp || "unknown";
}

function sanitizeUserAgent(input?: string): string {
  if (!input || !input.trim()) {
    return "Mozilla/5.0 (compatible; MD-Checker/1.0; +https://md-check.dotversis.com)";
  }

  const cleaned = input.replace(/[\r\n\t]/g, " ").trim();
  return cleaned.slice(0, 220);
}

function asRecord(headers: Headers): HeaderRecord {
  const out: HeaderRecord = {};
  for (const [key, value] of headers.entries()) {
    out[key] = value;
  }
  return out;
}

function isMarkdownContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("text/markdown");
}

async function readTextLimited(
  response: Response,
  limitChars: number,
): Promise<{ text: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const fallback = await response.text();
    return {
      text: fallback.slice(0, limitChars),
      truncated: fallback.length > limitChars,
    };
  }

  const decoder = new TextDecoder();
  let text = "";
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    text += decoder.decode(value, { stream: true });
    if (text.length > limitChars) {
      text = text.slice(0, limitChars);
      truncated = true;
      await reader.cancel();
      break;
    }
  }

  text += decoder.decode();
  return { text, truncated };
}

export async function POST(request: NextRequest) {
  const ip = getIpFromRequest(request);
  // Public endpoint: protect infra from bursts and cheap abuse.
  const rate = await enforceRateLimit(ip);

  if (!rate.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Try again in a few minutes.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
          "X-RateLimit-Reset": String(rate.reset),
        },
      },
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ error: "URL is required." }, { status: 400 });
  }

  let target: URL;
  try {
    target = assertSupportedUrl(body.url.trim());
    await assertSafeTarget(target);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid or blocked URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const userAgent = sanitizeUserAgent(body.userAgent);
  const startedAt = Date.now();

  try {
    const response = await fetch(target.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: "text/markdown",
        "User-Agent": userAgent,
      },
    });

    const latencyMs = Date.now() - startedAt;
    const headers = asRecord(response.headers);
    const contentType = response.headers.get("content-type");
    // Product rule from spec: markdown exists only when negotiation succeeded and server confirms markdown MIME.
    const found = response.ok && isMarkdownContentType(contentType);

    let markdownPreview = "";
    let truncated = false;

    if (found) {
      const read = await readTextLimited(response, MAX_MARKDOWN_CHARS);
      markdownPreview = read.text;
      truncated = read.truncated;
    }

    let reason = "";
    if (found) {
      reason = "Markdown detected: 2xx response with Content-Type text/markdown.";
    } else if (response.status >= 300 && response.status < 400) {
      reason = "Redirect response received and redirects are intentionally disabled.";
    } else if (!response.ok) {
      reason = "Target returned a non-2xx status.";
    } else {
      reason = "Target ignored markdown negotiation or returned a different content type.";
    }

    return NextResponse.json(
      {
        found,
        reason,
        request: {
          url: target.toString(),
          userAgent,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          contentType,
          contentLength: response.headers.get("content-length"),
          location: response.headers.get("location"),
          xMarkdownTokens: response.headers.get("x-markdown-tokens"),
          latencyMs,
          headers,
        },
        markdown: markdownPreview,
        truncated,
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
          "X-RateLimit-Reset": String(rate.reset),
        },
      },
    );
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        error.message.toLowerCase().includes("timeout"));

    return NextResponse.json(
      {
        error: isTimeout
          ? "Request timed out after 10 seconds."
          : "Failed to fetch target URL.",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: isTimeout ? 504 : 502,
      },
    );
  }
}
