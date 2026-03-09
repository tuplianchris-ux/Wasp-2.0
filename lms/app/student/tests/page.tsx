"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimerBar } from "@/components/shared/TimerBar";
import { GradeDisplay } from "@/components/shared/GradeDisplay";
import { Loader2, PlayCircle, Clock, CheckCircle2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { gradeColor } from "@/lib/utils";

interface Question {
  id: string;
  type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  question: string;
  options?: string[];
  points: number;
}

interface Test {
  id: string;
  title: string;
  type: string;
  timeLimit?: number;
  questions: string;
  _count: { attempts: number };
}

interface MyAttempt {
  testId: string;
  score?: number;
  feedback?: string;
}

type Screen = "list" | "taking" | "result";

export default function StudentTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [myAttempts, setMyAttempts] = useState<MyAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("list");
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; feedbackArr: { questionId: string; score: number; feedback: string }[] } | null>(null);

  const getStorageKey = (id: string) => `test_draft_${id}`;

  const load = async () => {
    const [tRes, aRes] = await Promise.all([
      fetch("/api/tests?published=true"),
      fetch("/api/tests/attempts/mine"),
    ]);
    setTests(await tRes.json());
    setMyAttempts(await aRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeTest && screen === "taking") {
      const saved = localStorage.getItem(getStorageKey(activeTest.id));
      if (saved) setAnswers(JSON.parse(saved));
    }
  }, [activeTest, screen]);

  const saveProgress = (newAnswers: Record<string, string>) => {
    if (activeTest) localStorage.setItem(getStorageKey(activeTest.id), JSON.stringify(newAnswers));
  };

  const startTest = (test: Test) => {
    setActiveTest(test);
    setAnswers({});
    setScreen("taking");
  };

  const handleAnswer = (qId: string, val: string) => {
    const updated = { ...answers, [qId]: val };
    setAnswers(updated);
    saveProgress(updated);
  };

  const handleSubmit = async () => {
    if (!activeTest) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tests/${activeTest.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Submission failed"); return; }
      localStorage.removeItem(getStorageKey(activeTest.id));
      setResult({ score: data.score, feedbackArr: data.feedbackArr });
      setScreen("result");
      load();
    } catch {
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  const getAttempt = (testId: string) => myAttempts.find((a) => a.testId === testId);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  // Test list
  if (screen === "list") return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Tests & Quizzes</h2>
        <p className="page-subtitle">Take published assessments assigned to you</p>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed">
          <p className="text-muted-foreground">No tests available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t, i) => {
            const attempt = getAttempt(t.id);
            const questions: Question[] = JSON.parse(t.questions);
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{t.title}</p>
                        <Badge variant={t.type === "EXAM" ? "destructive" : "secondary"}>{t.type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{questions.length} questions</span>
                        {t.timeLimit && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {t.timeLimit} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {attempt ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span className={`font-sora font-bold ${gradeColor(attempt.score ?? 0)}`}>
                            {Math.round(attempt.score ?? 0)}%
                          </span>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => startTest(t)}>
                          <PlayCircle className="h-4 w-4" /> Start
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Test taking screen
  if (screen === "taking" && activeTest) {
    const questions: Question[] = JSON.parse(activeTest.questions);
    const answered = Object.keys(answers).length;

    return (
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Exit test?")) { setScreen("list"); setActiveTest(null); } }}>
            <ChevronLeft className="h-4 w-4" /> Exit
          </Button>
          <div className="flex-1">
            <h2 className="page-title">{activeTest.title}</h2>
            <p className="page-subtitle">{answered} / {questions.length} answered</p>
          </div>
        </div>

        {activeTest.timeLimit && (
          <TimerBar durationMinutes={activeTest.timeLimit} onExpire={handleSubmit} />
        )}

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className={answers[q.id] ? "border-primary/40" : ""}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm flex-1">
                      <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                      {q.question}
                    </p>
                    <Badge variant="secondary" className="shrink-0">{q.points}pt{q.points > 1 ? "s" : ""}</Badge>
                  </div>

                  {q.type === "MCQ" && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"}`}>
                          <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => handleAnswer(q.id, opt)} className="shrink-0" />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "TRUE_FALSE" && (
                    <div className="flex gap-3">
                      {["True", "False"].map((v) => (
                        <label key={v} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === v ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"}`}>
                          <input type="radio" name={q.id} value={v} checked={answers[q.id] === v} onChange={() => handleAnswer(q.id, v)} />
                          <span className="text-sm font-medium">{v}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "SHORT_ANSWER" && (
                    <textarea
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Type your answer..."
                      value={answers[q.id] ?? ""}
                      onChange={(e) => handleAnswer(q.id, e.target.value)}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting} size="lg">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Test
          </Button>
        </div>
      </div>
    );
  }

  // Result screen
  if (screen === "result" && result && activeTest) {
    const questions: Question[] = JSON.parse(activeTest.questions);
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setScreen("list")}>
            <ChevronLeft className="h-4 w-4" /> Back to Tests
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h2 className="font-sora text-2xl font-bold">Test Complete!</h2>
          <p className="text-muted-foreground">{activeTest.title}</p>
        </div>

        <GradeDisplay score={result.score} />

        <div className="space-y-3">
          <h3 className="font-sora font-semibold">Question Breakdown</h3>
          {questions.map((q, idx) => {
            const fb = result.feedbackArr?.find((f) => f.questionId === q.id);
            return (
              <Card key={q.id} className={fb?.score && fb.score > 0 ? "border-emerald-500/30" : "border-red-500/20"}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-medium">Q{idx + 1}. {q.question}</p>
                  <p className="text-xs text-muted-foreground">Your answer: <span className="font-medium text-foreground">{answers[q.id] || "Not answered"}</span></p>
                  {fb && (
                    <p className={`text-xs ${fb.score > 0 ? "text-emerald-600" : "text-red-500"}`}>{fb.feedback}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
