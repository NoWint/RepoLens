import { Octokit } from "octokit";
import { RepoMeta, FileTreeNode } from "./types";

interface GitHubServiceConfig {
  token?: string;
}

class GitHubService {
  private octokit: Octokit;
  private owner: string = "";
  private repo: string = "";

  constructor(config: GitHubServiceConfig = {}) {
    this.octokit = new Octokit({
      auth: config.token || undefined,
    });
  }

  parseRepoUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new Error("Invalid GitHub repository URL");
    }
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  }

  setRepo(url: string): void {
    const { owner, repo } = this.parseRepoUrl(url);
    this.owner = owner;
    this.repo = repo;
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

  async getFileTree(): Promise<FileTreeNode> {
    const { data } = await this.octokit.rest.git.getTree({
      owner: this.owner,
      repo: this.repo,
      tree_sha: "HEAD",
      recursive: "true",
    });

    const root: FileTreeNode = {
      name: this.repo,
      path: "",
      type: "dir",
      children: [],
    };

    for (const item of data.tree) {
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
            size: item.size,
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
    } catch {
      return null;
    }
  }

  async getRecentCommits(count: number = 30): Promise<{ date: string; author: string }[]> {
    const { data } = await this.octokit.rest.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      per_page: count,
    });
    return data.map((c) => ({
      date: c.commit.author?.date || "",
      author: c.commit.author?.name || "",
    }));
  }

  async getIssuesStats(): Promise<{
    openCount: number;
    closedCount: number;
    avgCloseDays: number | null;
    hasLabels: boolean;
    recentlyClosed: boolean;
  }> {
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
    } catch {
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
    } catch {
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
}

export async function createGitHubService(
  url: string,
  token?: string
): Promise<GitHubService> {
  const service = new GitHubService({ token });
  service.setRepo(url);
  return service;
}

export { GitHubService };
