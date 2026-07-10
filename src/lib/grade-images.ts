export type Grade = "A" | "B" | "C" | "Reject";

const GRADE_IMAGES: Record<Grade, string> = {
  A: "/grades/grade a.png",
  B: "/grades/grade b.png",
  C: "/grades/grade c.png",
  Reject: "/grades/reject.png",
};

export function gradeImageUrl(grade: Grade): string {
  return GRADE_IMAGES[grade];
}

export function confidenceForGrade(grade: Grade): number {
  switch (grade) {
    case "A":
      return 90 + Math.floor(Math.random() * 8);
    case "B":
      return 80 + Math.floor(Math.random() * 9);
    case "C":
      return 68 + Math.floor(Math.random() * 11);
    case "Reject":
      return 42 + Math.floor(Math.random() * 22);
  }
}

/** Evenly picks a grade, then returns a matching confidence score. */
export function simulateGrade(): { grade: Grade; confidence: number } {
  const grades: Grade[] = ["A", "B", "C", "Reject"];
  const grade = grades[Math.floor(Math.random() * grades.length)]!;
  return { grade, confidence: confidenceForGrade(grade) };
}
