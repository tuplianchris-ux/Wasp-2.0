import { HttpError } from "wasp/server";
import type {
  CreateTask,
  UpdateTask,
  DeleteTask,
  CompleteTask,
} from "wasp/server/operations";
import { requireTeacher, requireStudent } from "../lib/authGuards";

type CreateTaskInput = {
  title: string;
  description?: string;
  dueDate?: string;
  userId: string;
};

type UpdateTaskInput = {
  id: string;
  title?: string;
  description?: string;
  dueDate?: string;
  completed?: boolean;
};

type DeleteTaskInput = { id: string };
type CompleteTaskInput = { id: string };

export const createTask: CreateTask<CreateTaskInput, any> = async (
  { title, description, dueDate, userId },
  context
) => {
  requireTeacher(context);
  return context.entities.Task.create({
    data: {
      title,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId,
    },
  });
};

export const updateTask: UpdateTask<UpdateTaskInput, any> = async (
  { id, title, description, dueDate, completed },
  context
) => {
  requireTeacher(context);
  return context.entities.Task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      ...(completed !== undefined && { completed }),
    },
  });
};

export const deleteTask: DeleteTask<DeleteTaskInput, void> = async (
  { id },
  context
) => {
  requireTeacher(context);
  await context.entities.Task.delete({ where: { id } });
};

export const completeTask: CompleteTask<CompleteTaskInput, any> = async (
  { id },
  context
) => {
  requireStudent(context);
  const task = await context.entities.Task.findUnique({ where: { id } });
  if (!task) throw new HttpError(404, "Task not found");
  if (task.userId !== context.user.id) throw new HttpError(403, "Not your task");
  return context.entities.Task.update({
    where: { id },
    data: { completed: true },
  });
};
