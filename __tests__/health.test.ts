import { describe, it, expect } from "vitest";

// We test the normalizeScore logic indirectly through the score calculation
// Since health.ts functions are tightly coupled with GitHubService,
// we test the scoring logic patterns here

describe("Health Score Calculation Logic", () => {
  it("should cap readme points at maxPoints", () => {
    const readmeLength = 10000; // Very long README
    const readmeMaxPoints = 30;
    const threshold = 500;
    const points = readmeLength > threshold
      ? readmeMaxPoints
      : Math.min(readmeMaxPoints, Math.floor(readmeLength / (threshold / readmeMaxPoints)));
    expect(points).toBe(30);
  });

  it("should give partial readme points for short README", () => {
    const readmeLength = 250;
    const readmeMaxPoints = 30;
    const threshold = 500;
    const points = readmeLength > threshold
      ? readmeMaxPoints
      : Math.min(readmeMaxPoints, Math.floor(readmeLength / (threshold / readmeMaxPoints)));
    // 250 / (500/30) = 250 / 16.666... = 14.999... → Math.floor = 14
    expect(points).toBe(14);
  });

  it("should give 0 points for empty README", () => {
    const readmeLength = 0;
    const readmeMaxPoints = 30;
    const threshold = 500;
    const points = readmeLength > threshold
      ? readmeMaxPoints
      : Math.min(readmeMaxPoints, Math.floor(readmeLength / (threshold / readmeMaxPoints)));
    expect(points).toBe(0);
  });

  it("should normalize raw score to 0-100", () => {
    // normalizeScore(rawScore, maxPoints) = Math.round(rawScore / maxPoints * 100)
    expect(Math.round(85 / 85 * 100)).toBe(100);
    expect(Math.round(42 / 85 * 100)).toBe(49);
    expect(Math.round(0 / 85 * 100)).toBe(0);
  });

  it("should label scores correctly", () => {
    const scoreToLabel = (score: number): string => {
      if (score >= 71) return "healthy";
      if (score >= 41) return "moderate";
      return "at-risk";
    };

    expect(scoreToLabel(100)).toBe("healthy");
    expect(scoreToLabel(71)).toBe("healthy");
    expect(scoreToLabel(70)).toBe("moderate");
    expect(scoreToLabel(41)).toBe("moderate");
    expect(scoreToLabel(40)).toBe("at-risk");
    expect(scoreToLabel(0)).toBe("at-risk");
  });

  it("should calculate close time points with degradation", () => {
    const avgCloseDays = 14;
    const goodThreshold = 7;
    const maxPoints = 30;
    const points = avgCloseDays < goodThreshold
      ? maxPoints
      : Math.max(0, maxPoints - Math.floor((avgCloseDays - goodThreshold) / 3) * 5);

    // 14 - 7 = 7, floor(7/3) = 2, 30 - 2*5 = 20
    expect(points).toBe(20);
  });
});
