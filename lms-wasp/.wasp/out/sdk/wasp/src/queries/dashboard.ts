import { HttpError } from "wasp/server";
import type { GetTeacherDashboardStats, GetStudentDashboardStats } from "wasp/server/operations";

export const getTeacherDashboardStats: GetTeacherDashboardStats<void, any> = async (
  _args,
  context
) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");
  if ((context.user as any).role !== "TEACHER") throw new HttpError(403, "Teachers only");

  const [assignmentCount, testCount, pendingGradesCount, studentCount] =
    await Promise.all([
      context.entities.Assignment.count(),
      context.entities.Test.count(),
      context.entities.Submission.count({ where: { grade: null } }),
      context.entities.User.count({ where: { role: "STUDENT" } }),
    ]);

  const [recentAssignments, pendingSubmissions] = await Promise.all([
    context.entities.Assignment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { submissions: true } } },
    }),
    context.entities.Submission.findMany({
      where: { grade: null },
      take: 5,
      include: {
        student: { select: { name: true } },
        assignment: { select: { title: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  return {
    assignmentCount,
    testCount,
    pendingGradesCount,
    studentCount,
    recentAssignments,
    pendingSubmissions,
  };
};

export const getStudentDashboardStats: GetStudentDashboardStats<void, any> = async (
  _args,
  context
) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  const userId = context.user.id;

  const [assignments, submissions, attempts, publishedTestCount] =
    await Promise.all([
      context.entities.Assignment.findMany({
        orderBy: { dueDate: "asc" },
        take: 10,
        select: { id: true, title: true, dueDate: true },
      }),
      context.entities.Submission.findMany({
        where: { userId },
        include: { assignment: { select: { title: true, id: true } } },
      }),
      context.entities.TestAttempt.findMany({
        where: { userId },
        include: { test: { select: { title: true } } },
      }),
      context.entities.Test.count({ where: { published: true } }),
    ]);

  const submittedAssignmentIds = new Set(
    submissions.map((s: any) => s.assignmentId)
  );
  const pendingAssignmentIds = assignments
    .filter((a: any) => !submittedAssignmentIds.has(a.id))
    .map((a: any) => a.id);

  return {
    pendingAssignmentIds,
    assignments,
    submissions,
    attempts,
    publishedTestCount,
  };
};
