export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

export class GitHubAPIError extends AnalysisError {
  constructor(
    message: string,
    public readonly githubStatus?: number
  ) {
    super(message, "GITHUB_API_ERROR", githubStatus === 404 ? 404 : githubStatus === 403 ? 429 : 500);
    this.name = "GitHubAPIError";
  }
}

export class RateLimitError extends AnalysisError {
  constructor(message = "Rate limit exceeded. Try adding a GitHub token or wait a bit.") {
    super(message, "RATE_LIMIT", 429);
    this.name = "RateLimitError";
  }
}

export class RepositoryNotFoundError extends AnalysisError {
  constructor(message = "Repository not found. It may be private - try adding a GitHub token.") {
    super(message, "REPO_NOT_FOUND", 404);
    this.name = "RepositoryNotFoundError";
  }
}

export class InvalidURLError extends AnalysisError {
  constructor(message = "Invalid GitHub repository URL format") {
    super(message, "INVALID_URL", 400);
    this.name = "InvalidURLError";
  }
}

export function isAnalysisError(error: unknown): error is AnalysisError {
  return error instanceof AnalysisError;
}

export function toAnalysisError(error: unknown): AnalysisError {
  if (isAnalysisError(error)) return error;

  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return new RepositoryNotFoundError();
    if (status === 403) return new RateLimitError();
    return new GitHubAPIError((error as Error).message || "GitHub API error", status);
  }

  return new AnalysisError(
    error instanceof Error ? error.message : "An unexpected error occurred",
    "UNKNOWN"
  );
}
