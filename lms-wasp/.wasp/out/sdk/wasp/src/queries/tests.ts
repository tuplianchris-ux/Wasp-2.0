import { HttpError } from "wasp/server";
import type { GetTests, GetTest, GetMyTestAttempts } from "wasp/server/operations";

export const getTests: GetTests<{ published?: boolean }, any[]> = async (
  { published },
  context
) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  return context.entities.Test.findMany({
    where: published ? { published: true } : {},
    include: { _count: { select: { attempts: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const getTest: GetTest<{ id: string }, any> = async ({ id }, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  const test = await context.entities.Test.findUnique({
    where: { id },
    include: {
      attempts: {
        include: { student: { select: { name: true, id: true } } },
      },
    },
  });

  if (!test) throw new HttpError(404, "Test not found");
  return test;
};

export const getMyTestAttempts: GetMyTestAttempts<void, any[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  return context.entities.TestAttempt.findMany({
    where: { userId: context.user.id },
    select: {
      id: true,
      testId: true,
      score: true,
      feedback: true,
      submittedAt: true,
      test: { select: { title: true, type: true } },
    },
  });
};
