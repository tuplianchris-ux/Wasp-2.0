import { useQuery } from "wasp/client/operations";
import { getStudentDashboardStats } from "wasp/client/operations";
import { Link } from "react-router";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ClipboardList, FlaskConical, CheckCircle, TrendingUp } from "lucide-react";
import { StatusBadge } from "../../components/shared/StatusBadge";
import { StatCard } from "../../components/shared/StatCard";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { formatDate, gradeColor } from "../../lib/utils";

export function StudentDashboardPage({ user }: { user: AuthUser }) {
  const { data: stats, isLoading } = useQuery(getStudentDashboardStats);
  const name = (user as any).name || "Student";

  const submissions = (stats?.submissions as any[]) ?? [];
  const assignments = (stats?.assignments as any[]) ?? [];
  const pendingIds = new Set<string>(stats?.pendingAssignmentIds ?? []);

  const graded = submissions.filter((s) => s.grade != null);
  const avgGrade = graded.length > 0
    ? Math.round(graded.reduce((acc: number, s: any) => acc + s.grade, 0) / graded.length)
    : null;

  const pending = assignments.filter((a) => pendingIds.has(a.id));

  return (
    <AppShell role="STUDENT" userName={name} pageTitle="Dashboard">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="page-title">Hello, {name}</h2>
            <p className="page-subtitle">Here&apos;s your learning overview for today.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Pending Assignments" value={pending.length} icon={ClipboardList} color="text-amber-500" bg="bg-amber-500/10" />
            <StatCard label="Tests Available" value={stats?.publishedTestCount ?? 0} icon={FlaskConical} color="text-violet-500" bg="bg-violet-500/10" />
            <StatCard label="Completed" value={submissions.length + ((stats?.attempts as any[])?.length ?? 0)} icon={CheckCircle} color="text-emerald-500" bg="bg-emerald-500/10" />
            <StatCard label="Average Grade" value={avgGrade !== null ? `${avgGrade}%` : "—"} icon={TrendingUp} color={gradeColor(avgGrade ?? 0)} bg="bg-teal-500/10" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Upcoming Assignments</CardTitle>
                  <Link to="/student/assignments" className="text-xs text-primary hover:underline">View all</Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!pending.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">All done!</p>
                ) : (
                  pending.slice(0, 4).map((a) => (
                    <Link key={a.id} to="/student/assignments" className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
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
                  <Link to="/student/assignments" className="text-xs text-primary hover:underline">View all</Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!graded.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No grades yet</p>
                ) : (
                  graded.slice(0, 4).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg">
                      <p className="text-sm font-medium">{s.assignment?.title}</p>
                      <span className={`font-bold ${gradeColor(s.grade ?? 0)}`} style={{ fontFamily: "Sora, sans-serif" }}>{s.grade}%</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
