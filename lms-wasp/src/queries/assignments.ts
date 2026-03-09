import { HttpError } from "wasp/server";
import type { GetAssignments, GetAssignment } from "wasp/server/operations";

export const getAssignments: GetAssignments<void, any[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  return context.entities.Assignment.findMany({
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getAssignment: GetAssignment<{ id: string }, any> = async ({ id }, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");

  const assignment = await context.entities.Assignment.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      submissions: {
        include: { student: { select: { name: true, id: true } } },
      },
    },
  });

  if (!assignment) throw new HttpError(404, "Assignment not found");
  return assignment;
};
