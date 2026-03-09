import { defineUserSignupFields } from "wasp/server/auth";

export const userSignupFields = defineUserSignupFields({
  name: (data: Record<string, unknown>) => {
    const name = data.name;
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Name is required");
    }
    return name.trim();
  },
  role: (data: Record<string, unknown>) => {
    const role = data.role;
    if (role !== "TEACHER" && role !== "STUDENT") {
      throw new Error("Role must be TEACHER or STUDENT");
    }
    return role;
  },
});
