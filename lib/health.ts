import { HealthScore, DimensionScore, ScoreDetail } from "./types";
import { GitHubService } from "./github";
import { ANALYSIS_CONFIG } from "./config";

export async function calculateHealthScore(
  github: GitHubService,
  readmeContent: string | null
): Promise<HealthScore> {
  const [documentation, issueActivity, maintenance] = await Promise.all([
    calculateDocumentation(github, readmeContent),
    calculateIssueActivity(github),
    calculateMaintenance(github),
  ]);

  const { documentation: wDoc, issueActivity: wIssue, maintenance: wMaint } = ANALYSIS_CONFIG.healthWeights;
  const overall = Math.round(
    documentation.score * wDoc +
    issueActivity.score * wIssue +
    maintenance.score * wMaint
  );

  return { overall, documentation, issueActivity, maintenance };
}

function normalizeScore(rawScore: number, maxPoints: number): number {
  return Math.round((rawScore / maxPoints) * 100);
}

async function calculateDocumentation(
  github: GitHubService,
  readmeContent: string | null
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let rawScore = 0;
  let maxPoints = 0;

  // README length
  const readmeLength = readmeContent?.length || 0;
  const readmeMaxPoints = 30;
  maxPoints += readmeMaxPoints;
  const readmePoints = readmeLength > ANALYSIS_CONFIG.healthThresholds.readmeLength
    ? readmeMaxPoints
    : Math.min(readmeMaxPoints, Math.floor(readmeLength / (ANALYSIS_CONFIG.healthThresholds.readmeLength / readmeMaxPoints)));
  details.push({ metric: "README length", value: readmeLength, points: readmePoints, maxPoints: readmeMaxPoints });
  rawScore += readmePoints;

  // Has installation docs
  const hasInstall = readmeContent
    ? /install|setup|getting started|quickstart|usage/i.test(readmeContent)
    : false;
  const installMaxPoints = 25;
  maxPoints += installMaxPoints;
  const installPoints = hasInstall ? installMaxPoints : 0;
  details.push({ metric: "Has installation docs", value: hasInstall, points: installPoints, maxPoints: installMaxPoints });
  rawScore += installPoints;

  // CONTRIBUTING.md + CHANGELOG.md (parallel check)
  const fileExists = await github.checkMultipleFilesExist(["CONTRIBUTING.md", "CHANGELOG.md", "CHANGELOG"]);
  const contributingMaxPoints = 20;
  const changelogMaxPoints = 10;
  maxPoints += contributingMaxPoints + changelogMaxPoints;

  const contributingPoints = fileExists["CONTRIBUTING.md"] ? contributingMaxPoints : 0;
  details.push({ metric: "CONTRIBUTING.md exists", value: fileExists["CONTRIBUTING.md"], points: contributingPoints, maxPoints: contributingMaxPoints });
  rawScore += contributingPoints;

  const changelogPoints = (fileExists["CHANGELOG.md"] || fileExists["CHANGELOG"]) ? changelogMaxPoints : 0;
  details.push({ metric: "CHANGELOG exists", value: fileExists["CHANGELOG.md"] || fileExists["CHANGELOG"], points: changelogPoints, maxPoints: changelogMaxPoints });
  rawScore += changelogMaxPoints;

  return {
    score: normalizeScore(rawScore, maxPoints),
    label: scoreToLabel(normalizeScore(rawScore, maxPoints)),
    details,
  };
}

async function calculateIssueActivity(
  github: GitHubService
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let rawScore = 0;
  let maxPoints = 0;

  const stats = await github.getIssuesStats();

  // Open issues count
  const openIssuesMaxPoints = 30;
  maxPoints += openIssuesMaxPoints;
  const lowIssuesPoints = stats.openCount < ANALYSIS_CONFIG.healthThresholds.openIssuesLow
    ? openIssuesMaxPoints
    : Math.max(0, openIssuesMaxPoints - Math.floor((stats.openCount - ANALYSIS_CONFIG.healthThresholds.openIssuesLow) / 10) * 5);
  details.push({ metric: "Open issues count", value: stats.openCount, points: lowIssuesPoints, maxPoints: openIssuesMaxPoints });
  rawScore += lowIssuesPoints;

  // Average close time
  const closeTimeMaxPoints = 30;
  maxPoints += closeTimeMaxPoints;
  const avgCloseDays = stats.avgCloseDays;
  const closeTimePoints = avgCloseDays !== null
    ? (avgCloseDays < ANALYSIS_CONFIG.healthThresholds.avgCloseDaysGood
      ? closeTimeMaxPoints
      : Math.max(0, closeTimeMaxPoints - Math.floor((avgCloseDays - ANALYSIS_CONFIG.healthThresholds.avgCloseDaysGood) / 3) * 5))
    : 0;
  details.push({ metric: "Avg issue close time (days)", value: avgCloseDays ?? "N/A", points: closeTimePoints, maxPoints: closeTimeMaxPoints });
  rawScore += closeTimePoints;

  // Issues use labels
  const labelMaxPoints = 20;
  maxPoints += labelMaxPoints;
  const labelPoints = stats.hasLabels ? labelMaxPoints : 0;
  details.push({ metric: "Issues use labels", value: stats.hasLabels, points: labelPoints, maxPoints: labelMaxPoints });
  rawScore += labelPoints;

  // Recently closed
  const recentMaxPoints = 20;
  maxPoints += recentMaxPoints;
  const recentPoints = stats.recentlyClosed ? recentMaxPoints : 0;
  details.push({ metric: "Issues closed in last 30 days", value: stats.recentlyClosed, points: recentPoints, maxPoints: recentMaxPoints });
  rawScore += recentPoints;

  return {
    score: normalizeScore(rawScore, maxPoints),
    label: scoreToLabel(normalizeScore(rawScore, maxPoints)),
    details,
  };
}

async function calculateMaintenance(
  github: GitHubService
): Promise<DimensionScore> {
  const details: ScoreDetail[] = [];
  let rawScore = 0;
  let maxPoints = 0;

  const [commits, contributors, latestRelease] = await Promise.all([
    github.getRecentCommits(30),
    github.getContributorsCount(),
    github.getLatestRelease(),
  ]);

  // Recent commit
  const recentCommitMaxPoints = 25;
  maxPoints += recentCommitMaxPoints;
  const lastCommitDate = commits[0]?.date;
  const daysSinceLastCommit = lastCommitDate
    ? (Date.now() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const recentCommitPoints = daysSinceLastCommit < ANALYSIS_CONFIG.healthThresholds.recentCommitDays
    ? recentCommitMaxPoints
    : Math.max(0, recentCommitMaxPoints - Math.floor((daysSinceLastCommit - ANALYSIS_CONFIG.healthThresholds.recentCommitDays) / 15) * 5);
  details.push({ metric: "Days since last commit", value: Math.round(daysSinceLastCommit), points: recentCommitPoints, maxPoints: recentCommitMaxPoints });
  rawScore += recentCommitPoints;

  // Monthly commits
  const commitFreqMaxPoints = 25;
  maxPoints += commitFreqMaxPoints;
  const monthlyCommits = commits.filter((c) => {
    const date = new Date(c.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
  }).length;
  const commitFreqPoints = monthlyCommits > ANALYSIS_CONFIG.healthThresholds.monthlyCommitsGood
    ? commitFreqMaxPoints
    : Math.min(commitFreqMaxPoints, Math.round(monthlyCommits * (commitFreqMaxPoints / ANALYSIS_CONFIG.healthThresholds.monthlyCommitsGood)));
  details.push({ metric: "Commits in last 30 days", value: monthlyCommits, points: commitFreqPoints, maxPoints: commitFreqMaxPoints });
  rawScore += commitFreqPoints;

  // Contributors
  const contributorMaxPoints = 25;
  maxPoints += contributorMaxPoints;
  const contributorPoints = contributors > ANALYSIS_CONFIG.healthThresholds.contributorsGood
    ? contributorMaxPoints
    : Math.min(contributorMaxPoints, Math.round(contributors * (contributorMaxPoints / ANALYSIS_CONFIG.healthThresholds.contributorsGood)));
  details.push({ metric: "Contributors", value: contributors, points: contributorPoints, maxPoints: contributorMaxPoints });
  rawScore += contributorPoints;

  // Recent release
  const releaseMaxPoints = 25;
  maxPoints += releaseMaxPoints;
  const hasRecentRelease = latestRelease
    ? (Date.now() - new Date(latestRelease.date).getTime()) / (1000 * 60 * 60 * 24 * (ANALYSIS_CONFIG.healthThresholds.releaseMonths * 30)) < 1
    : false;
  const releasePoints = hasRecentRelease ? releaseMaxPoints : 0;
  details.push({ metric: "Release in last 6 months", value: hasRecentRelease, points: releasePoints, maxPoints: releaseMaxPoints });
  rawScore += releasePoints;

  return {
    score: normalizeScore(rawScore, maxPoints),
    label: scoreToLabel(normalizeScore(rawScore, maxPoints)),
    details,
  };
}

function scoreToLabel(score: number): string {
  if (score >= 71) return "healthy";
  if (score >= 41) return "moderate";
  return "at-risk";
}
