"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Eye, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string;
  rubric?: string;
  points: number;
}

interface Test {
  id: string;
  title: string;
  type: string;
  published: boolean;
  timeLimit?: number;
  _count: { attempts: number };
}

function QuestionBuilder({ questions, setQuestions }: {
  questions: Question[];
  setQuestions: (q: Question[]) => void;
}) {
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        type: "MCQ",
        question: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        points: 1,
      },
    ]);
  };

  const updateQ = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQ = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  return (
    <div className="space-y-3">
      {questions.map((q, idx) => (
        <div key={q.id} className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground">Q{idx + 1}</span>
            <Select value={q.type} onValueChange={(v) => updateQ(q.id, { type: v as QuestionType })}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MCQ">Multiple Choice</SelectItem>
                <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="h-7 text-xs w-16"
              type="number"
              min={1}
              value={q.points}
              onChange={(e) => updateQ(q.id, { points: Number(e.target.value) })}
              placeholder="pts"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => removeQ(q.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>

          <Input
            placeholder="Question text..."
            value={q.question}
            onChange={(e) => updateQ(q.id, { question: e.target.value })}
            className="text-sm"
          />

          {q.type === "MCQ" && (
            <div className="space-y-2">
              {(q.options ?? ["", "", "", ""]).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctAnswer === opt && opt !== ""}
                    onChange={() => updateQ(q.id, { correctAnswer: opt })}
                    className="shrink-0"
                  />
                  <Input
                    placeholder={`Option ${oi + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const opts = [...(q.options ?? [])];
                      opts[oi] = e.target.value;
                      updateQ(q.id, { options: opts });
                    }}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
            </div>
          )}

          {q.type === "TRUE_FALSE" && (
            <div className="flex items-center gap-4">
              {["True", "False"].map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`tf-${q.id}`}
                    checked={q.correctAnswer === v}
                    onChange={() => updateQ(q.id, { correctAnswer: v })}
                  />
                  {v}
                </label>
              ))}
            </div>
          )}

          {q.type === "SHORT_ANSWER" && (
            <Input
              placeholder="Grading rubric / expected answer (for AI grading)..."
              value={q.rubric ?? ""}
              onChange={(e) => updateQ(q.id, { rubric: e.target.value })}
              className="text-xs"
            />
          )}
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="w-full">
        <Plus className="h-3 w-3" /> Add Question
      </Button>
    </div>
  );
}

export default function TeacherTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "QUIZ", timeLimit: "" });
  const [questions, setQuestions] = useState<Question[]>([]);

  const load = async () => {
    const res = await fetch("/api/tests");
    const data = await res.json();
    setTests(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length === 0) { toast.error("Add at least one question"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          timeLimit: form.timeLimit ? Number(form.timeLimit) : null,
          questions,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Test created!");
      setOpen(false);
      setForm({ title: "", type: "QUIZ", timeLimit: "" });
      setQuestions([]);
      load();
    } catch {
      toast.error("Failed to create test");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (test: Test) => {
    await fetch(`/api/tests/${test.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !test.published }),
    });
    toast.success(test.published ? "Test unpublished" : "Test published!");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    await fetch(`/api/tests/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Tests & Quizzes</h2>
          <p className="page-subtitle">Build and manage assessments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> New Test</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Test / Quiz</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. Unit 3 Quiz"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUIZ">Quiz</SelectItem>
                      <SelectItem value="TEST">Test</SelectItem>
                      <SelectItem value="EXAM">Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Time Limit (minutes, optional)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="No limit"
                  value={form.timeLimit}
                  onChange={(e) => setForm({ ...form, timeLimit: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Questions</Label>
                <QuestionBuilder questions={questions} setQuestions={setQuestions} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Test
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed">
          <p className="text-muted-foreground">No tests yet. Create your first assessment!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t.title}</p>
                      <Badge variant={t.type === "EXAM" ? "destructive" : "secondary"}>{t.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{t._count.attempts} attempts</span>
                      {t.timeLimit && <span className="text-xs text-muted-foreground">{t.timeLimit} min</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t.published ? "Published" : "Draft"}</span>
                      <Switch checked={t.published} onCheckedChange={() => togglePublish(t)} />
                    </div>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/teacher/tests/${t.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
