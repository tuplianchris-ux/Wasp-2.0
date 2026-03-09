import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") redirect("/login");

  return (
    <AppShell
      role="TEACHER"
      userName={session.user.name}
      pageTitle="Teacher Portal"
    >
      {children}
    </AppShell>
  );
}
