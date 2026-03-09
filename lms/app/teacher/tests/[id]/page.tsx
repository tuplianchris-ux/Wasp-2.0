"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { formatDateTime, gradeColor } from "@/lib/utils";
import Link from "next/link";

interface Attempt {
  id: string;
  score?: number;
  submittedAt: string;
  feedback?: string;
  student: { name: string; email: string };
}

interface Test {
  id: string;
  title: string;
  type: string;
  timeLimit?: number;
  published: boolean;
  questions: string;
  attempts: Attempt[];
}

export default function TestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tests/${id}`)
      .then((r) => r.json())
      .then((data) => { setTest(data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!test) return <p>Test not found</p>;

  const questions = JSON.parse(test.questions);
  const avgScore = test.attempts.length > 0
    ? Math.round(test.attempts.reduce((acc, a) => acc + (a.score ?? 0), 0) / test.attempts.length)
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/teacher/tests"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="page-title">{test.title}</h2>
          <p className="page-subtitle">
            {test.type} · {questions.length} questions · {test.attempts.length} attempts
            {avgScore !== null && ` · Avg: ${avgScore}%`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Attempts</p>
          <p className="text-2xl font-sora font-bold mt-1">{test.attempts.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Average Score</p>
          <p className={`text-2xl font-sora font-bold mt-1 ${avgScore !== null ? gradeColor(avgScore) : ""}`}>
            {avgScore !== null ? `${avgScore}%` : "—"}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground">Questions</p>
          <p className="text-2xl font-sora font-bold mt-1">{questions.length}</p>
        </div>
      </div>

      <div>
        <h3 className="font-sora font-semibold mb-3">Student Attempts</h3>
        {test.attempts.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed">
            <p className="text-muted-foreground text-sm">No attempts yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {test.attempts.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.student.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(a.submittedAt)}</p>
                    </div>
                    {a.score != null && (
                      <span className={`text-xl font-sora font-bold ${gradeColor(a.score)}`}>
                        {Math.round(a.score)}%
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
