export type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string;
  rubric?: string;
  points?: number;
}

export type Role = "TEACHER" | "STUDENT";
