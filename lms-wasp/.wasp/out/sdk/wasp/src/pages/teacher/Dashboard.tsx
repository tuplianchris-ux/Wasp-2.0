import { useQuery } from "wasp/client/operations";
import { getTeacherDashboardStats } from "wasp/client/operations";
import { Link } from "react-router";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ClipboardList, FlaskConical, Users, CheckCircle } from "lucide-react";
import { StatCard } from "../../components/shared/StatCard";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { formatDate } from "../../lib/utils";

export function TeacherDashboardPage({ user }: { user: AuthUser }) {
  const { data: stats, isLoading } = useQuery(getTeacherDashboardStats);
  const name = (user as any).name || "Teacher";

  return (
    <AppShell role="TEACHER" userName={name} pageTitle="Dashboard">
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="page-title">Welcome back, {name}</h2>
            <p className="page-subtitle">Here&apos;s what&apos;s happening in your classroom today.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Assignments" value={stats?.assignmentCount ?? 0} icon={ClipboardList} color="text-blue-500" bg="bg-blue-500/10" />
            <StatCard label="Tests Created" value={stats?.testCount ?? 0} icon={FlaskConical} color="text-violet-500" bg="bg-violet-500/10" />
            <StatCard label="Pending Grades" value={stats?.pendingGradesCount ?? 0} icon={CheckCircle} color="text-amber-500" bg="bg-amber-500/10" />
            <StatCard label="Students" value={stats?.studentCount ?? 0} icon={Users} color="text-teal-500" bg="bg-teal-500/10" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Assignments */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Recent Assignments</CardTitle>
                  <Link to="/teacher/assignments" className="text-xs text-primary hover:underline">View all</Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!stats?.recentAssignments?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No assignments yet</p>
                ) : (
                  (stats.recentAssignments as any[]).map((a) => (
                    <Link
                      key={a.id}
                      to={`/teacher/assignments/${a.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">Due {formatDate(a.dueDate)}</p>
                      </div>
                      <Badge variant="secondary">{a._count?.submissions ?? 0} submitted</Badge>
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
                  <Link to="/teacher/grading" className="text-xs text-primary hover:underline">View all</Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!stats?.pendingSubmissions?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">All caught up!</p>
                ) : (
                  (stats.pendingSubmissions as any[]).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{s.student?.name}</p>
                        <p className="text-xs text-muted-foreground">{s.assignment?.title}</p>
                      </div>
                      <Badge variant="warning">Pending</Badge>
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
