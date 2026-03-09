import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getTests, createTest, updateTest, deleteTest } from "wasp/client/operations";
import { Link } from "react-router";
import { toast } from "sonner";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Plus, Loader2, Trash2, Eye, GripVertical } from "lucide-react";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { EmptyState } from "../../components/shared/EmptyState";
import { motion } from "framer-motion";
import type { Question, QuestionType } from "../../types";

function QuestionBuilder({ questions, setQuestions }: { questions: Question[]; setQuestions: (q: Question[]) => void }) {
  const addQ = () => {
    setQuestions([...questions, {
      id: crypto.randomUUID(), type: "MCQ", question: "", options: ["", "", "", ""], correctAnswer: "", points: 1,
    }]);
  };

  const update = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const remove = (id: string) => setQuestions(questions.filter((q) => q.id !== id));

  return (
    <div className="space-y-3">
      {questions.map((q, idx) => (
        <div key={q.id} className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Q{idx + 1}</span>
            <Select value={q.type} onValueChange={(v) => update(q.id, { type: v as QuestionType, options: v === "MCQ" ? ["","","",""] : undefined, correctAnswer: "" })}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MCQ">Multiple Choice</SelectItem>
                <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" value={q.points} min={1} onChange={(e) => update(q.id, { points: Number(e.target.value) })} className="h-7 w-16 text-xs" placeholder="pts" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive ml-auto" onClick={() => remove(q.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>

          <Input placeholder="Question text..." value={q.question} onChange={(e) => update(q.id, { question: e.target.value })} className="text-sm" />

          {q.type === "MCQ" && q.options && (
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <Input key={oi} placeholder={`Option ${oi + 1}`} value={opt} className="text-xs h-7"
                  onChange={(e) => {
                    const opts = [...q.options!];
                    opts[oi] = e.target.value;
                    update(q.id, { options: opts });
                  }}
                />
              ))}
              <Input placeholder="Correct answer" value={q.correctAnswer ?? ""} className="text-xs h-7 col-span-2"
                onChange={(e) => update(q.id, { correctAnswer: e.target.value })}
              />
            </div>
          )}

          {q.type === "TRUE_FALSE" && (
            <Select value={q.correctAnswer ?? ""} onValueChange={(v) => update(q.id, { correctAnswer: v })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Correct answer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="True">True</SelectItem>
                <SelectItem value="False">False</SelectItem>
              </SelectContent>
            </Select>
          )}

          {q.type === "SHORT_ANSWER" && (
            <Input placeholder="Grading rubric (optional)" value={q.rubric ?? ""} onChange={(e) => update(q.id, { rubric: e.target.value })} className="text-xs h-7" />
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addQ}><Plus className="h-3 w-3" /> Add Question</Button>
    </div>
  );
}

export function TeacherTestsPage({ user }: { user: AuthUser }) {
  const { data: tests = [], isLoading, refetch } = useQuery(getTests);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "QUIZ" as "QUIZ" | "TEST" | "EXAM", timeLimit: "", published: false });
  const [questions, setQuestions] = useState<Question[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questions.length) { toast.error("Add at least one question"); return; }
    setSaving(true);
    try {
      await createTest({
        title: form.title,
        type: form.type,
        questions,
        timeLimit: form.timeLimit ? Number(form.timeLimit) : undefined,
        published: form.published,
      });
      toast.success("Test created!");
      setOpen(false);
      setForm({ title: "", type: "QUIZ", timeLimit: "", published: false });
      setQuestions([]);
      refetch();
    } catch {
      toast.error("Failed to create test");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (test: any) => {
    try {
      await updateTest({ id: test.id, published: !test.published });
      refetch();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    try {
      await deleteTest({ id });
      toast.success("Deleted");
      refetch();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <AppShell role="TEACHER" userName={(user as any).name || "Teacher"} pageTitle="Tests & Quizzes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Tests & Quizzes</h2>
            <p className="page-subtitle">Create and publish assessments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> New Test</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Test</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Title</Label>
                    <Input placeholder="Test title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUIZ">Quiz</SelectItem>
                        <SelectItem value="TEST">Test</SelectItem>
                        <SelectItem value="EXAM">Exam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time Limit (minutes)</Label>
                    <Input type="number" placeholder="Leave empty for untimed" value={form.timeLimit} onChange={(e) => setForm({ ...form, timeLimit: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                  <Label className="text-sm">Publish immediately</Label>
                </div>
                <div className="space-y-2">
                  <Label>Questions</Label>
                  <QuestionBuilder questions={questions} setQuestions={setQuestions} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (tests as any[]).length === 0 ? (
          <EmptyState message="No tests yet. Create your first one!" />
        ) : (
          <div className="space-y-3">
            {(tests as any[]).map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{t.title}</p>
                        <Badge variant={t.type === "EXAM" ? "destructive" : "secondary"}>{t.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t._count?.attempts ?? 0} attempts ·{" "}
                        {t.published ? <span className="text-emerald-500">Published</span> : <span className="text-amber-500">Draft</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={t.published} onCheckedChange={() => handleTogglePublish(t)} />
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/teacher/tests/${t.id}`}><Eye className="h-3 w-3" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
