import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getSubmissions, gradeSubmission } from "wasp/client/operations";
import { toast } from "sonner";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { EmptyState } from "../../components/shared/EmptyState";
import { SubmissionGradingCard } from "../../components/shared/SubmissionGradingCard";

export function TeacherSubmissionsPage({ user }: { user: AuthUser }) {
  const { data: submissions = [], isLoading, refetch } = useQuery(getSubmissions);
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [grading, setGrading] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

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

  const filtered = filter === "pending"
    ? (submissions as any[]).filter((s) => s.grade == null)
    : (submissions as any[]);

  return (
    <AppShell role="TEACHER" userName={(user as any).name || "Teacher"} pageTitle="Grading">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Grading</h2>
            <p className="page-subtitle">Review and grade student submissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>Pending</Button>
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={filter === "pending" ? "All submissions graded!" : "No submissions yet"}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((sub: any) => {
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
                />
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
