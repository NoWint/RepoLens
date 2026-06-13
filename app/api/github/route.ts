import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const token = request.nextUrl.searchParams.get("token");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub URL" },
        { status: 400 }
      );
    }

    const octokit = new Octokit({ auth: token || undefined });
    const { data } = await octokit.rest.repos.get({
      owner: match[1],
      repo: match[2].replace(/\.git$/, ""),
    });

    return NextResponse.json({
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      isPrivate: data.private,
    });
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 404) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch repository info" },
      { status: 500 }
    );
  }
}
