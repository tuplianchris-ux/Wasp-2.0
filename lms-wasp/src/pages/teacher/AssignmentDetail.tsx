import { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery } from "wasp/client/operations";
import { getAssignment, gradeSubmission, gradeWithAi } from "wasp/client/operations";
import { toast } from "sonner";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { ChevronLeft } from "lucide-react";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { EmptyState } from "../../components/shared/EmptyState";
import { SubmissionGradingCard } from "../../components/shared/SubmissionGradingCard";
import { formatDate } from "../../lib/utils";

export function TeacherAssignmentDetailPage({ user }: { user: AuthUser }) {
  const { id } = useParams<{ id: string }>();
  const { data: assignment, isLoading, refetch } = useQuery(getAssignment, { id: id! });
  const [grading, setGrading] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [aiGrading, setAiGrading] = useState<string | null>(null);

  const handleGrade = async (subId: string) => {
    setSaving(subId);
    try {
      const g = grading[subId];
      await gradeSubmission({ id: subId, grade: Number(g?.grade), feedback: g?.feedback });
      toast.success("Grade saved!");
      refetch();
    } catch {
      toast.error("Failed to save grade");
    } finally {
      setSaving(null);
    }
  };

  const handleAiGrade = async (sub: any) => {
    setAiGrading(sub.id);
    try {
      const result = await gradeWithAi({
        question: (assignment as any)?.description || "Assignment",
        studentAnswer: sub.textContent || "",
        maxPoints: 100,
      }) as any;
      setGrading((prev) => ({
        ...prev,
        [sub.id]: { grade: String(result.score), feedback: result.feedback },
      }));
      toast.success("AI grading complete!");
    } catch {
      toast.error("AI grading failed");
    } finally {
      setAiGrading(null);
    }
  };

  const a = assignment as any;

  return (
    <AppShell role="TEACHER" userName={(user as any).name || "Teacher"} pageTitle="Assignment Detail">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/teacher/assignments"><ChevronLeft className="h-4 w-4" /> Back</Link>
          </Button>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : !a ? (
          <p className="text-muted-foreground">Assignment not found</p>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="page-title">{a.title}</h2>
              <p className="page-subtitle">Due {formatDate(a.dueDate)} · {a.submissions?.length ?? 0} submissions</p>
              <p className="text-sm text-muted-foreground mt-2">{a.description}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold" style={{ fontFamily: "Sora, sans-serif" }}>Submissions</h3>
              {!a.submissions?.length ? (
                <EmptyState message="No submissions yet" />
              ) : (
                a.submissions.map((sub: any) => {
                  const g = grading[sub.id] ?? { grade: sub.grade?.toString() ?? "", feedback: sub.feedback ?? "" };
                  return (
                    <SubmissionGradingCard
                      key={sub.id}
                      sub={sub}
                      grading={g}
                      onGradingChange={(grade, feedback) =>
                        setGrading({ ...grading, [sub.id]: { grade, feedback } })
                      }
                      onSave={() => handleGrade(sub.id)}
                      saving={saving === sub.id}
                      showAiGrade
                      onAiGrade={() => handleAiGrade(sub)}
                      aiGrading={aiGrading === sub.id}
                    />
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
