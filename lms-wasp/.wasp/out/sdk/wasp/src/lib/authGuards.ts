import { HttpError } from "wasp/server";

/** Accepts Wasp action/query context where user may be undefined or null */
type ContextWithUser = { user?: { id: string; role?: string } | null };

export function requireAuth(context: ContextWithUser): asserts context is ContextWithUser & { user: { id: string; role?: string } } {
  if (context.user == null) throw new HttpError(401, "Unauthorized");
}

export function requireTeacher(context: ContextWithUser): asserts context is ContextWithUser & { user: { id: string; role: string } } {
  requireAuth(context);
  if ((context.user as { role?: string }).role !== "TEACHER") {
    throw new HttpError(403, "Teachers only");
  }
}

export function requireStudent(context: ContextWithUser): asserts context is ContextWithUser & { user: { id: string; role: string } } {
  requireAuth(context);
  if ((context.user as { role?: string }).role !== "STUDENT") {
    throw new HttpError(403, "Students only");
  }
}
