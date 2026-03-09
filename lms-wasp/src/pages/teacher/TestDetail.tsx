import { useParams, Link } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getTest } from "wasp/client/operations";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ChevronLeft } from "lucide-react";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { formatDateTime, gradeColor } from "../../lib/utils";

export function TeacherTestDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const { data: test, isLoading } = useQuery(getTest, { id: id! });
  const t = test as any;

  return (
    <AppShell role="TEACHER" userName={(user as any).name || "Teacher"} pageTitle="Test Detail">
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/teacher/tests"><ChevronLeft className="h-4 w-4" /> Back</Link>
        </Button>

        {isLoading ? (
          <LoadingSpinner />
        ) : !t ? (
          <p className="text-muted-foreground">Test not found</p>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="page-title">{t.title}</h2>
                <Badge variant={t.type === "EXAM" ? "destructive" : "secondary"}>{t.type}</Badge>
                <Badge variant={t.published ? "success" : "warning"}>{t.published ? "Published" : "Draft"}</Badge>
              </div>
              <p className="page-subtitle">{t.attempts?.length ?? 0} student attempts</p>
            </div>

            {/* Questions preview */}
            <div className="space-y-3">
              <h3 className="font-semibold" style={{ fontFamily: "Sora, sans-serif" }}>Questions ({JSON.parse(t.questions || "[]").length})</h3>
              {JSON.parse(t.questions || "[]").map((q: any, idx: number) => (
                <Card key={q.id}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium">Q{idx + 1}. {q.question}</p>
                      <Badge variant="secondary">{q.points}pt</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{q.type}</p>
                    {q.type === "MCQ" && q.options && (
                      <ul className="text-xs text-muted-foreground list-disc list-inside">
                        {q.options.map((o: string, oi: number) => (
                          <li key={oi} className={o === q.correctAnswer ? "text-emerald-500" : ""}>{o}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Attempts */}
            <div className="space-y-3">
              <h3 className="font-semibold" style={{ fontFamily: "Sora, sans-serif" }}>Student Attempts</h3>
              {!t.attempts?.length ? (
                <div className="text-center py-8 rounded-xl border border-dashed">
                  <p className="text-muted-foreground">No attempts yet</p>
                </div>
              ) : (
                t.attempts.map((a: any) => (
                  <Card key={a.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{a.student?.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(a.submittedAt)}</p>
                      </div>
                      {a.score != null && (
                        <span className={`font-bold text-lg ${gradeColor(a.score)}`} style={{ fontFamily: "Sora, sans-serif" }}>
                          {Math.round(a.score)}%
                        </span>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
