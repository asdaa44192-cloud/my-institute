import { describe, expect, it } from "vitest";
import { computeGradeStats } from "./grade-stats";

describe("computeGradeStats", () => {
  it("averages percentage scores per subject and sorts subjects alphabetically", () => {
    const stats = computeGradeStats([
      { subject: "Science", score: 80, maxScore: 100 },
      { subject: "Math", score: 90, maxScore: 100 },
      { subject: "Math", score: 70, maxScore: 100 },
    ]);
    expect(stats).toEqual([
      { subject: "Math", average: 80 },
      { subject: "Science", average: 80 },
    ]);
  });

  it("normalizes differing max scores to a percentage before averaging", () => {
    const stats = computeGradeStats([
      { subject: "Art", score: 5, maxScore: 10 }, // 50%
      { subject: "Art", score: 40, maxScore: 50 }, // 80%
    ]);
    expect(stats).toEqual([{ subject: "Art", average: 65 }]);
  });

  it("returns an empty array for no records", () => {
    expect(computeGradeStats([])).toEqual([]);
  });
});
