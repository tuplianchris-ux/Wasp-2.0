import { HttpError } from "wasp/server";
import type {
  CreateTest,
  UpdateTest,
  DeleteTest,
  SubmitTestAttempt,
} from "wasp/server/operations";
import type { Question } from "../types";
import { requireTeacher, requireStudent } from "../lib/authGuards";

type CreateTestInput = {
  title: string;
  type?: "QUIZ" | "TEST" | "EXAM";
  questions: Question[];
  timeLimit?: number;
  published?: boolean;
};

type UpdateTestInput = {
  id: string;
  title?: string;
  published?: boolean;
  questions?: Question[];
  timeLimit?: number;
};

type DeleteTestInput = { id: string };

type SubmitTestAttemptInput = {
  testId: string;
  answers: Record<string, string>;
};

export const createTest: CreateTest<any, any> = async (
  { title, type, questions, timeLimit, published }: CreateTestInput,
  context
) => {
  requireTeacher(context);
  return context.entities.Test.create({
    data: {
      title,
      type: type ?? "QUIZ",
      questions: JSON.stringify(questions ?? []),
      timeLimit: timeLimit != null ? Number(timeLimit) : null,
      published: published ?? false,
    },
  });
};

export const updateTest: UpdateTest<any, any> = async (
  { id, title, published, questions, timeLimit }: UpdateTestInput,
  context
) => {
  requireTeacher(context);
  return context.entities.Test.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(published !== undefined && { published }),
      ...(questions !== undefined && { questions: JSON.stringify(questions) }),
      ...(timeLimit !== undefined && { timeLimit }),
    },
  });
};

export const deleteTest: DeleteTest<DeleteTestInput, void> = async ({ id }, context) => {
  requireTeacher(context);
  await context.entities.Test.delete({ where: { id } });
};

export const submitTestAttempt: SubmitTestAttempt<SubmitTestAttemptInput, any> = async (
  { testId, answers },
  context
) => {
  requireStudent(context);
  const test = await context.entities.Test.findUnique({ where: { id: testId } });
  if (!test) throw new HttpError(404, "Test not found");
  if (!(test as any).published) throw new HttpError(403, "Test is not published");

  const existing = await context.entities.TestAttempt.findFirst({
    where: { testId, userId: context.user.id },
  });
  if (existing) throw new HttpError(409, "Already attempted this test");

  const questions: Question[] = JSON.parse((test as any).questions as string);

  let totalPoints = 0;
  let earnedPoints = 0;
  const feedbackArr: { questionId: string; score: number; feedback: string }[] = [];

  for (const q of questions) {
    const pts = q.points ?? 1;
    totalPoints += pts;
    const studentAnswer = answers[q.id] ?? "";

    if (q.type === "MCQ" || q.type === "TRUE_FALSE") {
      const correct =
        studentAnswer.trim().toLowerCase() ===
        (q.correctAnswer ?? "").trim().toLowerCase();
      earnedPoints += correct ? pts : 0;
      feedbackArr.push({
        questionId: q.id,
        score: correct ? pts : 0,
        feedback: correct ? "Correct!" : `Incorrect. Correct answer: ${q.correctAnswer}`,
      });
    } else {
      feedbackArr.push({
        questionId: q.id,
        score: 0,
        feedback: "Awaiting AI grading...",
      });
    }
  }

  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  const attempt = await context.entities.TestAttempt.create({
    data: {
      testId,
      userId: context.user.id,
      answers: JSON.stringify(answers),
      score,
      autoGraded: true,
      feedback: JSON.stringify(feedbackArr),
    },
  });

  return { ...attempt, feedbackArr };
};
