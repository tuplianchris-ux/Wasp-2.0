import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "TEACHER" | "STUDENT";
    };
  }

  interface User {
    role: "TEACHER" | "STUDENT";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "TEACHER" | "STUDENT";
    id: string;
  }
}
