import { HttpError } from "wasp/server";
import type { GetTasks, GetMyTasks, GetStudents } from "wasp/server/operations";
import { requireTeacher } from "../lib/authGuards";
import { isMockMode, mockTasks, mockMyTasks } from "../lib/mockData";

export const getTasks: GetTasks<void, any[]> = async (_args, context) => {
  requireTeacher(context);
  if (isMockMode()) return mockTasks as any[];
  return context.entities.Task.findMany({
    include: { assignedTo: { select: { name: true, id: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const getMyTasks: GetMyTasks<void, any[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Unauthorized");
  if (isMockMode()) return mockMyTasks as any[];
  return context.entities.Task.findMany({
    where: { userId: context.user.id },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
  });
};

export const getStudents: GetStudents<void, any[]> = async (_args, context) => {
  requireTeacher(context);
  if (isMockMode()) {
    return [{ id: "mock-user-1", name: "Student One" }, { id: "mock-user-2", name: "Student Two" }] as any[];
  }
  return context.entities.User.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
};
