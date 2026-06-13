import { describe, it, expect } from "vitest";
import { GitHubService } from "../lib/github";

describe("GitHubService.parseRepoUrl", () => {
  it("should parse standard GitHub URL", () => {
    const result = GitHubService.parseRepoUrl("https://github.com/owner/repo");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should parse GitHub URL with .git suffix", () => {
    const result = GitHubService.parseRepoUrl("https://github.com/owner/repo.git");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should parse GitHub URL with trailing slash", () => {
    const result = GitHubService.parseRepoUrl("https://github.com/owner/repo/");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should parse GitHub URL with .git and trailing slash", () => {
    const result = GitHubService.parseRepoUrl("https://github.com/owner/repo.git/");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("should throw for invalid URL", () => {
    expect(() => GitHubService.parseRepoUrl("not-a-url")).toThrow("Invalid GitHub repository URL");
  });

  it("should throw for incomplete URL", () => {
    expect(() => GitHubService.parseRepoUrl("https://github.com/owner")).toThrow("Invalid GitHub repository URL");
  });
});

describe("GitHubService.fromUrl", () => {
  it("should create instance from URL", () => {
    const service = GitHubService.fromUrl("https://github.com/facebook/react");
    expect(service).toBeInstanceOf(GitHubService);
  });

  it("should create instance with token", () => {
    const service = GitHubService.fromUrl("https://github.com/facebook/react", "ghp_test123");
    expect(service).toBeInstanceOf(GitHubService);
  });
});
