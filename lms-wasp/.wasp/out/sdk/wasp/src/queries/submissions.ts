import { HttpError } from "wasp/server";
import type { GetSubmissions, GetMySubmissions } from "wasp/server/operations";

export const getSubmissions: GetSubmissions<void, any[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");
  if ((context.user as any).role !== "TEACHER") throw new HttpError(403, "Teachers only");

  return context.entities.Submission.findMany({
    include: {
      student: { select: { name: true, id: true } },
      assignment: { select: { title: true, id: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
};

export const getMySubmissions: GetMySubmissions<void, any[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  return context.entities.Submission.findMany({
    where: { userId: context.user.id },
    include: { assignment: { select: { title: true, id: true, dueDate: true } } },
    orderBy: { submittedAt: "desc" },
  });
};
