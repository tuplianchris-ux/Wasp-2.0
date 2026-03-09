import { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { MOCK_STUDENT_ID, MOCK_TEACHER_ID } from "@/lib/mockData";

const DEMO_PASSWORD = "demo";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        if (process.env.MOCK_MODE === "true") {
          if (
            credentials.email === "student@demo.local" &&
            credentials.password === DEMO_PASSWORD
          ) {
            return {
              id: MOCK_STUDENT_ID,
              email: "student@demo.local",
              name: "Demo Student",
              role: "STUDENT" as const,
            };
          }
          if (
            credentials.email === "teacher@demo.local" &&
            credentials.password === DEMO_PASSWORD
          ) {
            return {
              id: MOCK_TEACHER_ID,
              email: "teacher@demo.local",
              name: "Demo Teacher",
              role: "TEACHER" as const,
            };
          }
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as User & { role: "TEACHER" | "STUDENT" }).role;
        token.id = user.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
};
