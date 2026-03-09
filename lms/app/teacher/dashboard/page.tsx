import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, FlaskConical, Users, CheckCircle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { mockData, mockStore, isMockMode } from "@/lib/mockData";

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let assignments: number;
  let tests: number;
  let submissions: number;
  let students: number;
  let recentAssignments: { id: string; title: string; dueDate: Date; _count: { submissions: number } }[];
  let pendingSubmissions: { id: string; student: { name: string }; assignment: { title: string } }[];

  if (isMockMode()) {
    assignments = mockData.assignmentsWithCount.length;
    tests = mockData.testsWithCount.length;
    submissions = mockStore.submissions.filter((s) => s.grade == null).length;
    students = 1;
    recentAssignments = mockData.recentAssignments.map((a) => ({
      ...a,
      dueDate: new Date(a.dueDate),
    }));
    pendingSubmissions = mockData.pendingSubmissions;
  } else {
    const [a, t, sub, stu] = await Promise.all([
      prisma.assignment.count(),
      prisma.test.count(),
      prisma.submission.count({ where: { grade: null } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
    ]);
    assignments = a;
    tests = t;
    submissions = sub;
    students = stu;
    recentAssignments = await prisma.assignment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { submissions: true } } },
    });
    pendingSubmissions = await prisma.submission.findMany({
      where: { grade: null },
      take: 5,
      include: {
        student: { select: { name: true } },
        assignment: { select: { title: true } },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  const stats = [
    { label: "Total Assignments", value: assignments, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Tests Created", value: tests, icon: FlaskConical, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Pending Grades", value: submissions, icon: CheckCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Students", value: students, icon: Users, color: "text-teal-500", bg: "bg-teal-500/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="page-title">Welcome back, {session?.user.name} 👋</h2>
        <p className="page-subtitle">Here's what's happening in your classroom today.</p>
      </div>

      {/* Stats */}
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
        {/* Recent Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Assignments</CardTitle>
              <Link href="/teacher/assignments" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No assignments yet</p>
            ) : (
              recentAssignments.map((a) => (
                <Link
                  key={a.id}
                  href={`/teacher/assignments/${a.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(a.dueDate)}</p>
                  </div>
                  <Badge variant="secondary">{a._count.submissions} submitted</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Grading */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Needs Grading</CardTitle>
              <Link href="/teacher/grading" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All caught up! 🎉</p>
            ) : (
              pendingSubmissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{s.student.name}</p>
                    <p className="text-xs text-muted-foreground">{s.assignment.title}</p>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
