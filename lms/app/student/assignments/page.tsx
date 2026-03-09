"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { GradeDisplay } from "@/components/shared/GradeDisplay";
import { CalendarDays, Loader2, Send, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  textContent?: string;
  grade?: number;
  feedback?: string;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitOpen, setSubmitOpen] = useState<string | null>(null);

  const load = async () => {
    const [aRes, sRes] = await Promise.all([
      fetch("/api/assignments"),
      fetch("/api/submissions/mine"),
    ]);
    setAssignments(await aRes.json());
    setSubmissions(await sRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getSubmission = (assignmentId: string) =>
    submissions.find((s) => s.assignmentId === assignmentId);

  const handleSubmit = async (assignmentId: string) => {
    setSubmitting(assignmentId);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textContent: drafts[assignmentId] ?? "" }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to submit");
        return;
      }
      toast.success("Assignment submitted!");
      setSubmitOpen(null);
      load();
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Assignments</h2>
        <p className="page-subtitle">View, submit, and track your assignments</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed">
          <p className="text-muted-foreground">No assignments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a, i) => {
            const sub = getSubmission(a.id);
            const status = sub ? (sub.grade != null ? "graded" : "submitted") : "pending";
            const isExpanded = expanded === a.id;

            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <button
                      className="w-full flex items-center gap-4 text-left"
                      onClick={() => setExpanded(isExpanded ? null : a.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{a.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            Due {formatDate(a.dueDate)}
                          </span>
                          <StatusBadge status={status} />
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 space-y-4 border-t mt-4">
                            <p className="text-sm text-muted-foreground">{a.description}</p>

                            {sub ? (
                              <>
                                {sub.textContent && (
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">Your Submission</p>
                                    <p className="text-sm whitespace-pre-wrap">{sub.textContent}</p>
                                  </div>
                                )}
                                {sub.grade != null && (
                                  <GradeDisplay score={sub.grade} feedback={sub.feedback} />
                                )}
                              </>
                            ) : (
                              <Dialog open={submitOpen === a.id} onOpenChange={(o) => setSubmitOpen(o ? a.id : null)}>
                                <DialogTrigger asChild>
                                  <Button size="sm"><Send className="h-3 w-3" /> Submit Assignment</Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader><DialogTitle>Submit: {a.title}</DialogTitle></DialogHeader>
                                  <div className="space-y-3">
                                    <Label>Your Answer / Response</Label>
                                    <Textarea
                                      placeholder="Type your response here..."
                                      rows={6}
                                      value={drafts[a.id] ?? ""}
                                      onChange={(e) => setDrafts({ ...drafts, [a.id]: e.target.value })}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button variant="ghost" onClick={() => setSubmitOpen(null)}>Cancel</Button>
                                      <Button onClick={() => handleSubmit(a.id)} disabled={submitting === a.id}>
                                        {submitting === a.id && <Loader2 className="h-3 w-3 animate-spin" />}
                                        Submit
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
