import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, FlaskConical, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatDate, gradeColor } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockData, isMockMode } from "@/lib/mockData";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  let assignments: { id: string; title: string; dueDate: Date }[];
  let submissions: { id: string; assignmentId: string; grade: number | null; assignment: { title: string } }[];
  let attempts: { id: string; test: { title: string } }[];
  let tests: number;

  if (isMockMode()) {
    const mockAssignments = mockData.assignmentsWithCount
      .map((a) => ({ id: a.id, title: a.title, dueDate: new Date(a.dueDate) }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5);
    assignments = mockAssignments;
    submissions = mockData.submissionsForUser(userId);
    attempts = mockData.attemptsForUser(userId);
    tests = mockData.publishedTestCount();
  } else {
    const [a, s, att, t] = await Promise.all([
      prisma.assignment.findMany({ orderBy: { dueDate: "asc" }, take: 5 }),
      prisma.submission.findMany({ where: { userId }, include: { assignment: { select: { title: true } } } }),
      prisma.testAttempt.findMany({ where: { userId }, include: { test: { select: { title: true } } } }),
      prisma.test.count({ where: { published: true } }),
    ]);
    assignments = a;
    submissions = s;
    attempts = att;
    tests = t;
  }

  const pending = assignments.filter((a) => !submissions.find((s) => s.assignmentId === a.id));
  const graded = submissions.filter((s) => s.grade != null);
  const avgGrade = graded.length > 0
    ? Math.round(graded.reduce((acc, s) => acc + (s.grade ?? 0), 0) / graded.length)
    : null;

  const stats = [
    { label: "Pending Assignments", value: pending.length, icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Tests Available", value: tests, icon: FlaskConical, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Completed", value: submissions.length + attempts.length, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Average Grade", value: avgGrade !== null ? `${avgGrade}%` : "—", icon: TrendingUp, color: gradeColor(avgGrade ?? 0), bg: "bg-teal-500/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="page-title">Hello, {session?.user.name} 👋</h2>
        <p className="page-subtitle">Here's your learning overview for today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-3xl font-sora font-bold mt-2">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Assignments</CardTitle>
              <Link href="/student/assignments" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All done! 🎉</p>
            ) : (
              pending.slice(0, 4).map((a) => (
                <Link key={a.id} href="/student/assignments" className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(a.dueDate)}</p>
                  </div>
                  <StatusBadge status="pending" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Grades</CardTitle>
              <Link href="/student/assignments" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {graded.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No grades yet</p>
            ) : (
              graded.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg">
                  <p className="text-sm font-medium">{s.assignment.title}</p>
                  <span className={`font-sora font-bold ${gradeColor(s.grade ?? 0)}`}>{s.grade}%</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
