import { NextRequest } from "next/server";
import { analyzeRepository } from "@/lib/analyzer";
import { AnalyzeRequest } from "@/lib/types";
import { ANALYSIS_CONFIG } from "@/lib/config";
import { createLogger } from "@/lib/logger";
import { toAnalysisError, InvalidURLError } from "@/lib/errors";

const logger = createLogger("api:analyze");

const cache = new Map<string, { data: unknown; timestamp: number }>();

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ANALYSIS_CONFIG.cacheTTL) {
    return entry.data;
  }
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  if (cache.size >= ANALYSIS_CONFIG.maxCacheEntries) {
    const oldest = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { url, token } = body;

    if (!url) {
      return Response.json({ error: "Repository URL is required" }, { status: 400 });
    }

    const githubUrlPattern = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
    if (!githubUrlPattern.test(url.replace(/\.git$/, ""))) {
      const err = new InvalidURLError();
      return Response.json({ error: err.message }, { status: err.statusCode });
    }

    const cacheKey = `${url}:${token ? "auth" : "anon"}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const report = await analyzeRepository(url, token, (progress) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`));
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", data: report })}\n\n`));
          setCache(cacheKey, report);
          controller.close();
        } catch (error: unknown) {
          const err = toAnalysisError(error);
          logger.error("Analysis failed", { error: String(error) });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: err.message, status: err.statusCode })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    logger.error("Request parsing failed", { error: String(error) });
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
