import { NextRequest } from "next/server";
import { analyzeRepository } from "@/lib/analyzer";
import { AnalyzeRequest } from "@/lib/types";
import { ANALYSIS_CONFIG } from "@/lib/config";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:analyze");

// LRU Cache
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
  // Evict oldest entries if cache is full
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
      return new Response(JSON.stringify({ error: "Repository URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const githubUrlPattern = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
    if (!githubUrlPattern.test(url.replace(/\.git$/, ""))) {
      return new Response(JSON.stringify({ error: "Invalid GitHub repository URL format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check cache
    const cacheKey = `${url}:${token ? "auth" : "anon"}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    // SSE streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const report = await analyzeRepository(url, token, (progress) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`));
          });

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", data: report })}\n\n`));

          // Cache result
          setCache(cacheKey, report);

          controller.close();
        } catch (error: unknown) {
          const err = error as { status?: number; message?: string };
          logger.error("Analysis failed", { error: String(error) });

          const status = err.status === 404 ? 404 : err.status === 403 ? 429 : 500;
          const message = err.status === 404
            ? "Repository not found. It may be private - try adding a GitHub token."
            : err.status === 403
            ? "GitHub API rate limit exceeded. Try adding a GitHub token or wait a bit."
            : err.message || "Analysis failed";

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message, status })}\n\n`));
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
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
