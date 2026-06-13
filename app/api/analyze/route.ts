import { NextRequest, NextResponse } from "next/server";
import { analyzeRepository } from "@/lib/analyzer";
import { AnalyzeRequest } from "@/lib/types";

// In-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { url, token } = body;

    if (!url) {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 }
      );
    }

    // Validate GitHub URL format
    const githubUrlPattern = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
    if (!githubUrlPattern.test(url.replace(/\.git$/, ""))) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL format" },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${url}:${token ? "auth" : "anon"}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Analyze
    const report = await analyzeRepository(url, token);

    // Cache result
    cache.set(cacheKey, { data: report, timestamp: Date.now() });

    return NextResponse.json(report);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };

    if (err.status === 404) {
      return NextResponse.json(
        { error: "Repository not found. It may be private - try adding a GitHub token." },
        { status: 404 }
      );
    }

    if (err.status === 403) {
      return NextResponse.json(
        { error: "GitHub API rate limit exceeded. Try adding a GitHub token or wait a bit." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
