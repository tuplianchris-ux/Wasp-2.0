import { HttpError } from "wasp/server";
import type {
  CreateAssignment,
  UpdateAssignment,
  DeleteAssignment,
  SubmitAssignment,
} from "wasp/server/operations";
import { requireTeacher, requireStudent } from "../lib/authGuards";

type CreateAssignmentInput = {
  title: string;
  description: string;
  dueDate: string;
  fileUrl?: string;
};

type UpdateAssignmentInput = {
  id: string;
  title?: string;
  description?: string;
  dueDate?: string;
};

type DeleteAssignmentInput = { id: string };

type SubmitAssignmentInput = {
  assignmentId: string;
  textContent?: string;
  fileUrl?: string;
};

export const createAssignment: CreateAssignment<CreateAssignmentInput, any> = async (
  { title, description, dueDate, fileUrl },
  context
) => {
  requireTeacher(context);
  return context.entities.Assignment.create({
    data: {
      title,
      description,
      dueDate: new Date(dueDate),
      fileUrl: fileUrl ?? null,
      userId: context.user.id,
    },
  });
};

export const updateAssignment: UpdateAssignment<UpdateAssignmentInput, any> = async (
  { id, title, description, dueDate },
  context
) => {
  requireTeacher(context);
  return context.entities.Assignment.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
    },
  });
};

export const deleteAssignment: DeleteAssignment<DeleteAssignmentInput, void> = async (
  { id },
  context
) => {
  requireTeacher(context);
  await context.entities.Assignment.delete({ where: { id } });
};

export const submitAssignment: SubmitAssignment<SubmitAssignmentInput, any> = async (
  { assignmentId, textContent, fileUrl },
  context
) => {
  requireStudent(context);
  const existing = await context.entities.Submission.findFirst({
    where: { assignmentId, userId: context.user.id },
  });
  if (existing) throw new HttpError(409, "Already submitted");

  return context.entities.Submission.create({
    data: {
      assignmentId,
      userId: context.user.id,
      textContent: textContent ?? null,
      fileUrl: fileUrl ?? null,
    },
  });
};
