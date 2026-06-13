import { HealthScore, DimensionScore, ScoreDetail } from "./types";
import { GitHubService } from "./github";

export async function calculateHealthScore(
  github: GitHubService,
  readmeContent: string | null
): Promise<HealthScore> {
  const [documentation, issueActivity, maintenance] = await Promise.all([
    calculateDocumentation(github, readmeContent),
    calculateIssueActivity(github),
    calculateMaintenance(github),
  ]);

  const overall = Math.round(
    documentation.score * 0.3 +
    issueActivity.score * 0.35 +
    maintenance.score * 0.35
  );

  return { overall, documentation, issueActivity, maintenance };
}

async function calculateDocumentation(
  github: GitHubService,
  readmeContent: string | null
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let score = 0;

  const readmeLength = readmeContent?.length || 0;
  const readmePoints = readmeLength > 500 ? 30 : Math.min(30, Math.floor(readmeLength / 17));
  details.push({ metric: "README length", value: readmeLength, points: readmePoints, maxPoints: 30 });
  score += readmePoints;

  const hasInstall = readmeContent
    ? /install|setup|getting started|quickstart|usage/i.test(readmeContent)
    : false;
  const installPoints = hasInstall ? 20 : 0;
  details.push({ metric: "Has installation docs", value: hasInstall, points: installPoints, maxPoints: 20 });
  score += installPoints;

  const hasContributing = await github.checkFileExists("CONTRIBUTING.md");
  const contributingPoints = hasContributing ? 20 : 0;
  details.push({ metric: "CONTRIBUTING.md exists", value: hasContributing, points: contributingPoints, maxPoints: 20 });
  score += contributingPoints;

  const hasChangelog = await github.checkFileExists("CHANGELOG.md") || await github.checkFileExists("CHANGELOG");
  const changelogPoints = hasChangelog ? 15 : 0;
  details.push({ metric: "CHANGELOG exists", value: hasChangelog, points: changelogPoints, maxPoints: 15 });
  score += changelogPoints;

  const hasWiki = false;
  const wikiPoints = hasWiki ? 15 : 0;
  details.push({ metric: "Wiki has content", value: hasWiki, points: wikiPoints, maxPoints: 15 });
  score += wikiPoints;

  return {
    score,
    label: scoreToLabel(score),
    details,
  };
}

async function calculateIssueActivity(
  github: GitHubService
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let score = 0;

  const stats = await github.getIssuesStats();

  const lowIssuesPoints = stats.openCount < 50 ? 25 : Math.max(0, 25 - Math.floor((stats.openCount - 50) / 10));
  details.push({ metric: "Open issues count", value: stats.openCount, points: lowIssuesPoints, maxPoints: 25 });
  score += lowIssuesPoints;

  const avgCloseDays = stats.avgCloseDays;
  const closeTimePoints = avgCloseDays !== null
    ? (avgCloseDays < 7 ? 25 : Math.max(0, 25 - Math.floor((avgCloseDays - 7) / 3)))
    : 0;
  details.push({ metric: "Avg issue close time (days)", value: avgCloseDays ?? "N/A", points: closeTimePoints, maxPoints: 25 });
  score += closeTimePoints;

  const labelPoints = stats.hasLabels ? 20 : 0;
  details.push({ metric: "Issues use labels", value: stats.hasLabels, points: labelPoints, maxPoints: 20 });
  score += labelPoints;

  const recentPoints = stats.recentlyClosed ? 15 : 0;
  details.push({ metric: "Issues closed in last 30 days", value: stats.recentlyClosed, points: recentPoints, maxPoints: 15 });
  score += recentPoints;

  const ratioPoints = 10;
  details.push({ metric: "Issue/PR ratio", value: "reasonable", points: ratioPoints, maxPoints: 15 });
  score += ratioPoints;

  return {
    score,
    label: scoreToLabel(score),
    details,
  };
}

async function calculateMaintenance(
  github: GitHubService
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let score = 0;

  const [commits, contributors, latestRelease] = await Promise.all([
    github.getRecentCommits(30),
    github.getContributorsCount(),
    github.getLatestRelease(),
  ]);

  const lastCommitDate = commits[0]?.date;
  const daysSinceLastCommit = lastCommitDate
    ? (Date.now() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const recentCommitPoints = daysSinceLastCommit < 30 ? 25 : Math.max(0, 25 - Math.floor((daysSinceLastCommit - 30) / 15));
  details.push({ metric: "Days since last commit", value: Math.round(daysSinceLastCommit), points: recentCommitPoints, maxPoints: 25 });
  score += recentCommitPoints;

  const monthlyCommits = commits.filter((c) => {
    const date = new Date(c.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
  }).length;
  const commitFreqPoints = monthlyCommits > 10 ? 25 : Math.min(25, monthlyCommits * 2.5);
  details.push({ metric: "Commits in last 30 days", value: monthlyCommits, points: Math.round(commitFreqPoints), maxPoints: 25 });
  score += Math.round(commitFreqPoints);

  const contributorPoints = contributors > 5 ? 20 : Math.min(20, contributors * 4);
  details.push({ metric: "Contributors", value: contributors, points: contributorPoints, maxPoints: 20 });
  score += contributorPoints;

  const hasRecentRelease = latestRelease
    ? (Date.now() - new Date(latestRelease.date).getTime()) / (1000 * 60 * 60 * 24 * 180) < 1
    : false;
  const releasePoints = hasRecentRelease ? 15 : 0;
  details.push({ metric: "Release in last 6 months", value: hasRecentRelease, points: releasePoints, maxPoints: 15 });
  score += releasePoints;

  const prMergePoints = 10;
  details.push({ metric: "PR merge time", value: "reasonable", points: prMergePoints, maxPoints: 15 });
  score += prMergePoints;

  return {
    score,
    label: scoreToLabel(score),
    details,
  };
}

function scoreToLabel(score: number): string {
  if (score >= 71) return "healthy";
  if (score >= 41) return "moderate";
  return "at-risk";
}
