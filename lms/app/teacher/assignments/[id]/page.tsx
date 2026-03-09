"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { GradeDisplay } from "@/components/shared/GradeDisplay";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface Submission {
  id: string;
  textContent?: string;
  fileUrl?: string;
  grade?: number;
  feedback?: string;
  submittedAt: string;
  student: { name: string; email: string };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  submissions: Submission[];
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/assignments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAssignment(data);
        const g: Record<string, { grade: string; feedback: string }> = {};
        data.submissions?.forEach((s: Submission) => {
          g[s.id] = { grade: s.grade?.toString() ?? "", feedback: s.feedback ?? "" };
        });
        setGrading(g);
        setLoading(false);
      });
  }, [id]);

  const handleGrade = async (subId: string) => {
    setSaving(subId);
    try {
      const res = await fetch(`/api/submissions/${subId}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: Number(grading[subId]?.grade),
          feedback: grading[subId]?.feedback,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Grade saved!");
    } catch {
      toast.error("Failed to save grade");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!assignment) return <p>Assignment not found</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/teacher/assignments"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="page-title">{assignment.title}</h2>
          <p className="page-subtitle">Due {formatDate(assignment.dueDate)} · {assignment.submissions.length} submissions</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Instructions</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">{assignment.description}</p>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-sora font-semibold mb-3">Submissions ({assignment.submissions.length})</h3>
        {assignment.submissions.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed">
            <p className="text-muted-foreground text-sm">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignment.submissions.map((sub) => {
              const g = grading[sub.id] ?? { grade: "", feedback: "" };
              return (
                <Card key={sub.id}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{sub.student.name}</p>
                        <p className="text-xs text-muted-foreground">{sub.student.email} · {formatDateTime(sub.submittedAt)}</p>
                      </div>
                      <StatusBadge status={sub.grade != null ? "graded" : "submitted"} />
                    </div>

                    {sub.textContent && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm whitespace-pre-wrap">{sub.textContent}</p>
                      </div>
                    )}

                    {sub.grade != null && (
                      <GradeDisplay score={sub.grade} feedback={sub.feedback} />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Grade (0–100)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Score"
                          value={g.grade}
                          onChange={(e) => setGrading({ ...grading, [sub.id]: { ...g, grade: e.target.value } })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Feedback</Label>
                        <Input
                          placeholder="Comments..."
                          value={g.feedback}
                          onChange={(e) => setGrading({ ...grading, [sub.id]: { ...g, feedback: e.target.value } })}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => handleGrade(sub.id)}
                      disabled={saving === sub.id}
                      size="sm"
                    >
                      {saving === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save Grade
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
