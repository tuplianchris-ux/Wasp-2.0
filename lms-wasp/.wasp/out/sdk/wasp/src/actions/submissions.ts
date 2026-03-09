import type { GradeSubmission } from "wasp/server/operations";
import { requireTeacher } from "../lib/authGuards";

type GradeSubmissionInput = {
  id: string;
  grade: number;
  feedback?: string;
};

export const gradeSubmission: GradeSubmission<GradeSubmissionInput, any> = async (
  { id, grade, feedback },
  context
) => {
  requireTeacher(context);
  return context.entities.Submission.update({
    where: { id },
    data: {
      grade: Number(grade),
      feedback: feedback ?? null,
    },
  });
};
