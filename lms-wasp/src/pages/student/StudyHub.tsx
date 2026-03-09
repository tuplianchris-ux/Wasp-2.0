import { useState } from "react";
import { getAiStudyGuide } from "wasp/client/operations";
import { toast } from "sonner";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Card, CardContent } from "../../components/ui/card";
import { MarkdownRenderer } from "../../components/shared/MarkdownRenderer";
import { Brain, Loader2, Sparkles, BookOpen, Zap, HelpCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StudyPackage {
  studyGuide: string;
  flashcards: { q: string; a: string }[];
  practiceQuestions: { question: string; answer: string; explanation: string }[];
  summary: string;
}

function FlashCard({ q, a }: { q: string; a: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      onClick={() => setFlipped((f) => !f)}
      className="cursor-pointer rounded-xl border bg-card p-5 min-h-[120px] flex flex-col items-center justify-center text-center transition-all hover:shadow-md select-none"
    >
      <p className="text-xs text-muted-foreground mb-2">{flipped ? "Answer" : "Question"}</p>
      <p className="text-sm font-medium">{flipped ? a : q}</p>
      <p className="text-xs text-muted-foreground mt-3">{flipped ? "Click to see question" : "Click to reveal answer"}</p>
    </div>
  );
}

function PracticeQuestion({ item, idx }: { item: { question: string; answer: string; explanation: string }; idx: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="font-medium text-sm">
          <span className="text-muted-foreground mr-2">{idx + 1}.</span>
          {item.question}
        </p>
        <Button variant="outline" size="sm" onClick={() => setRevealed((r) => !r)}>
          {revealed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {revealed ? "Hide Answer" : "Show Answer"}
        </Button>
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t pt-3 space-y-2">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{item.answer}</p>
                {item.explanation && (
                  <p className="text-xs text-muted-foreground">{item.explanation}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export function StudentStudyHubPage({ user }: { user: AuthUser }) {
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("High School");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudyPackage | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) { toast.error("Enter a topic first"); return; }
    setLoading(true);
    setResult(null);
    try {
      const data = await getAiStudyGuide({ topic, gradeLevel, goal }) as StudyPackage;
      setResult(data);
      toast.success("Study package generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate study content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell role="STUDENT" userName={(user as any).name || "Student"} pageTitle="Study Hub">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="page-title">Study Hub</h2>
          <p className="page-subtitle">AI-powered personalized study packages</p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-semibold" style={{ fontFamily: "Sora, sans-serif" }}>Generate Study Package</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label>Topic</Label>
                  <Input
                    placeholder="e.g. The French Revolution, Quadratic Equations..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Grade Level</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Elementary">Elementary</SelectItem>
                      <SelectItem value="Middle School">Middle School</SelectItem>
                      <SelectItem value="High School">High School</SelectItem>
                      <SelectItem value="College">College</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Learning Goal (optional)</Label>
                <Input
                  placeholder="e.g. Prepare for an exam, understand key concepts..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate Study Package</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Brain className="h-6 w-6 text-primary absolute inset-0 m-auto" />
            </div>
            <p className="text-sm text-muted-foreground">AI is preparing your study package...</p>
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Tabs defaultValue="guide" className="space-y-4">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="guide" className="gap-1.5"><BookOpen className="h-3 w-3" /> Study Guide</TabsTrigger>
                <TabsTrigger value="flashcards" className="gap-1.5"><Zap className="h-3 w-3" /> Flashcards ({result.flashcards?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="practice" className="gap-1.5"><HelpCircle className="h-3 w-3" /> Practice ({result.practiceQuestions?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="summary" className="gap-1.5"><FileText className="h-3 w-3" /> Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="guide">
                <Card>
                  <CardContent className="p-6">
                    <MarkdownRenderer content={result.studyGuide} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="flashcards">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.flashcards?.map((fc, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <FlashCard q={fc.q} a={fc.a} />
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="practice">
                <div className="space-y-3">
                  {result.practiceQuestions?.map((pq, i) => (
                    <PracticeQuestion key={i} item={pq} idx={i} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="summary">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.summary}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
