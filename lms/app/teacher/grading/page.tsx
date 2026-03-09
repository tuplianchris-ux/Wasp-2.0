"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

interface Submission {
  id: string;
  textContent?: string;
  fileUrl?: string;
  grade?: number;
  feedback?: string;
  submittedAt: string;
  student: { name: string };
  assignment: { title: string };
}

export default function GradingPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [grading, setGrading] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/submissions");
    const data = await res.json();
    setSubmissions(data);
    const g: Record<string, { grade: string; feedback: string }> = {};
    data.forEach((s: Submission) => {
      g[s.id] = { grade: s.grade?.toString() ?? "", feedback: s.feedback ?? "" };
    });
    setGrading(g);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleGrade = async (subId: string) => {
    setSaving(subId);
    try {
      const res = await fetch(`/api/submissions/${subId}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: Number(grading[subId]?.grade), feedback: grading[subId]?.feedback }),
      });
      if (!res.ok) throw new Error();
      toast.success("Grade saved!");
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const filtered = filter === "pending" ? submissions.filter((s) => s.grade == null) : submissions;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Grading</h2>
          <p className="page-subtitle">Review and grade student submissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>
            Pending
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed">
          <p className="text-muted-foreground">{filter === "pending" ? "All submissions graded! 🎉" : "No submissions yet"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((sub) => {
            const g = grading[sub.id] ?? { grade: "", feedback: "" };
            return (
              <Card key={sub.id}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{sub.student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.assignment.title} · {formatDateTime(sub.submittedAt)}
                      </p>
                    </div>
                    <StatusBadge status={sub.grade != null ? "graded" : "submitted"} />
                  </div>

                  {sub.textContent && (
                    <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{sub.textContent}</p>
                    </div>
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

                  <Button onClick={() => handleGrade(sub.id)} disabled={saving === sub.id} size="sm">
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
  );
}
