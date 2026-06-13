import { Octokit } from "octokit";
import { RepoMeta, FileTreeNode } from "./types";
import { createLogger } from "./logger";

const logger = createLogger("github");

interface GitHubServiceConfig {
  owner: string;
  repo: string;
  token?: string;
}

class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: GitHubServiceConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.octokit = new Octokit({
      auth: config.token || undefined,
    });
  }

  static parseRepoUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new Error("Invalid GitHub repository URL");
    }
    return { owner: match[1], repo: match[2].replace(/\.git$/, "").replace(/\/$/, "") };
  }

  static fromUrl(url: string, token?: string): GitHubService {
    const { owner, repo } = GitHubService.parseRepoUrl(url);
    return new GitHubService({ owner, repo, token });
  }

  async getRepoMeta(): Promise<RepoMeta> {
    const { data } = await this.octokit.rest.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      language: data.language,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      defaultBranch: data.default_branch,
      license: data.license?.spdx_id || null,
      size: data.size,
      topics: data.topics || [],
    };
  }

  async listLanguages(): Promise<Record<string, number>> {
    try {
      const { data } = await this.octokit.rest.repos.listLanguages({
        owner: this.owner,
        repo: this.repo,
      });
      return data as Record<string, number>;
    } catch (error) {
      logger.error("Failed to list languages", { error: String(error) });
      return {};
    }
  }

  async getFileTree(): Promise<FileTreeNode> {
    // Try recursive first
    const { data } = await this.octokit.rest.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: "HEAD",
      recursive: "true",
    });

    if (!data.truncated) {
      return this.buildTreeFromFlatList(data.tree);
    }

    // Fallback: non-recursive tree + lazy loading for large repos
    logger.warn("File tree was truncated, falling back to non-recursive mode", {
      owner: this.owner,
      repo: this.repo,
    });

    const { data: topData } = await this.octokit.rest.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: "HEAD",
      recursive: "1" as "true",
    });

    return this.buildTreeFromFlatList(topData.tree);
  }

  private buildTreeFromFlatList(tree: { path?: string | null; type?: string | null; size?: number | null }[]): FileTreeNode {
    const root: FileTreeNode = {
      name: this.repo,
      path: "",
      type: "dir",
      children: [],
    };

    for (const item of tree) {
      if (!item.path) continue;

      const parts = item.path.split("/");
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1 && item.type === "blob";

        if (isFile) {
          current.children = current.children || [];
          current.children.push({
            name: part,
            path: item.path,
            type: "file",
            size: item.size ?? undefined,
          });
        } else {
          current.children = current.children || [];
          let dir = current.children.find(
            (c) => c.name === part && c.type === "dir"
          );
          if (!dir) {
            dir = {
              name: part,
              path: parts.slice(0, i + 1).join("/"),
              type: "dir",
              children: [],
            };
            current.children.push(dir);
          }
          current = dir;
        }
      }
    }

    return root;
  }

  async getFileContent(path: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });
      if ("content" in data && "encoding" in data) {
        return Buffer.from(data.content, data.encoding as BufferEncoding).toString("utf-8");
      }
      return null;
    } catch (error) {
      logger.debug("File not found", { path, error: String(error) });
      return null;
    }
  }

  async getMultipleFiles(paths: string[]): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};
    const promises = paths.map(async (path) => {
      results[path] = await this.getFileContent(path);
    });
    await Promise.all(promises);
    return results;
  }

  async getRecentCommits(count: number = 30): Promise<{ date: string; author: string }[]> {
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        per_page: count,
      });
      return data.map((c) => ({
        date: c.commit.author?.date || "",
        author: c.commit.author?.name || "",
      }));
    } catch (error) {
      logger.error("Failed to get recent commits", { error: String(error) });
      return [];
    }
  }

  async getIssuesStats(): Promise<{
    openCount: number;
    closedCount: number;
    avgCloseDays: number | null;
    hasLabels: boolean;
    recentlyClosed: boolean;
  }> {
    try {
      const [openRes, closedRes] = await Promise.all([
        this.octokit.rest.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: "open",
          per_page: 1,
        }),
        this.octokit.rest.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: "closed",
          per_page: 30,
          sort: "updated",
          direction: "desc",
        }),
      ]);

      const openCount = openRes.headers["x-total-count"]
        ? parseInt(openRes.headers["x-total-count"] as string)
        : 0;

      const closedIssues = closedRes.data.filter((i) => !i.pull_request);
      const recentlyClosed = closedIssues.some((i) => {
        const closedAt = new Date(i.closed_at || "");
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return closedAt > thirtyDaysAgo;
      });

      const hasLabels = closedIssues.some((i) => (i.labels?.length || 0) > 0);

      let avgCloseDays: number | null = null;
      if (closedIssues.length > 0) {
        const days = closedIssues
          .filter((i) => i.closed_at && i.created_at)
          .map((i) => {
            const created = new Date(i.created_at);
            const closed = new Date(i.closed_at!);
            return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          });
        if (days.length > 0) {
          avgCloseDays = days.reduce((a, b) => a + b, 0) / days.length;
        }
      }

      return {
        openCount,
        closedCount: parseInt(closedRes.headers["x-total-count"] as string) || closedIssues.length,
        avgCloseDays,
        hasLabels,
        recentlyClosed,
      };
    } catch (error) {
      logger.error("Failed to get issues stats", { error: String(error) });
      return { openCount: 0, closedCount: 0, avgCloseDays: null, hasLabels: false, recentlyClosed: false };
    }
  }

  async getContributorsCount(): Promise<number> {
    try {
      const { headers } = await this.octokit.rest.repos.listContributors({
        owner: this.owner,
        repo: this.repo,
        per_page: 1,
        page: 1,
      });
      const linkHeader = headers.link || "";
      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      return lastPageMatch ? parseInt(lastPageMatch[1]) : 1;
    } catch (error) {
      logger.error("Failed to get contributors count", { error: String(error) });
      return 0;
    }
  }

  async getLatestRelease(): Promise<{ date: string; tag: string } | null> {
    try {
      const { data } = await this.octokit.rest.repos.getLatestRelease({
        owner: this.owner,
        repo: this.repo,
      });
      return { date: data.published_at || "", tag: data.tag_name };
    } catch (error) {
      logger.debug("No latest release found", { error: String(error) });
      return null;
    }
  }

  async checkFileExists(path: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });
      return true;
    } catch {
      return false;
    }
  }

  async checkMultipleFilesExist(paths: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    await Promise.all(
      paths.map(async (path) => {
        results[path] = await this.checkFileExists(path);
      })
    );
    return results;
  }

  async getDirectoryListing(dirPath: string): Promise<FileTreeNode[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: dirPath,
      });

      if (!Array.isArray(data)) return [];

      return data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type === "dir" ? "dir" : "file",
        size: item.size ?? undefined,
        children: item.type === "dir" ? [] : undefined,
      }));
    } catch (error) {
      logger.debug("Directory listing failed", { path: dirPath, error: String(error) });
      return [];
    }
  }
}

export { GitHubService };
