import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mockStore, isMockMode } from "@/lib/mockData";

interface Question {
  id: string;
  type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  question: string;
  options?: string[];
  correctAnswer?: string;
  rubric?: string;
  points?: number;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { answers } = await req.json();

  if (isMockMode()) {
    const test = mockStore.tests.find((t) => t.id === params.id);
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
    const existing = mockStore.attempts.find(
      (a) => a.testId === params.id && a.userId === session.user.id
    );
    if (existing) return NextResponse.json({ error: "Already attempted" }, { status: 409 });
    const questions: Question[] = JSON.parse(test.questions as string);
    let totalPoints = 0;
    let earnedPoints = 0;
    const feedbackArr: { questionId: string; score: number; feedback: string }[] = [];
    for (const q of questions) {
      const pts = q.points ?? 1;
      totalPoints += pts;
      const studentAnswer = (answers && answers[q.id]) ?? "";
      if (q.type === "MCQ" || q.type === "TRUE_FALSE") {
        const correct =
          studentAnswer.trim().toLowerCase() === (q.correctAnswer ?? "").trim().toLowerCase();
        earnedPoints += correct ? pts : 0;
        feedbackArr.push({
          questionId: q.id,
          score: correct ? pts : 0,
          feedback: correct ? "Correct!" : `Incorrect. Correct answer: ${q.correctAnswer}`,
        });
      } else {
        feedbackArr.push({ questionId: q.id, score: 0, feedback: "Awaiting AI grading..." });
      }
    }
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const attempt = {
      id: `mock-attempt-${Date.now()}`,
      testId: params.id,
      userId: session.user.id,
      answers: JSON.stringify(answers ?? {}),
      score,
      autoGraded: true,
      feedback: JSON.stringify(feedbackArr),
      submittedAt: new Date(),
    };
    mockStore.attempts.push(attempt);
    return NextResponse.json({ ...attempt, feedbackArr });
  }

  const test = await prisma.test.findUnique({ where: { id: params.id } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const existing = await prisma.testAttempt.findFirst({
    where: { testId: params.id, userId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Already attempted" }, { status: 409 });

  const questions: Question[] = JSON.parse(test.questions as string);

  let totalPoints = 0;
  let earnedPoints = 0;
  const feedbackArr: { questionId: string; score: number; feedback: string }[] = [];

  for (const q of questions) {
    const pts = q.points ?? 1;
    totalPoints += pts;
    const studentAnswer = answers[q.id] ?? "";

    if (q.type === "MCQ" || q.type === "TRUE_FALSE") {
      const correct =
        studentAnswer.trim().toLowerCase() === (q.correctAnswer ?? "").trim().toLowerCase();
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

  const attempt = await prisma.testAttempt.create({
    data: {
      testId: params.id,
      userId: session.user.id,
      answers: JSON.stringify(answers),
      score,
      autoGraded: true,
      feedback: JSON.stringify(feedbackArr),
    },
  });

  return NextResponse.json({ ...attempt, feedbackArr });
}
