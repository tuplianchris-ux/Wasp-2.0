import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import {
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
} from "wasp/client/operations";
import { Link } from "react-router";
import { toast } from "sonner";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Plus, Loader2, Trash2, Eye, CalendarDays } from "lucide-react";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { EmptyState } from "../../components/shared/EmptyState";
import { formatDate } from "../../lib/utils";
import { motion } from "framer-motion";

export function TeacherAssignmentsPage({ user }: { user: AuthUser }) {
  const { data: assignments = [], isLoading, refetch } = useQuery(getAssignments);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAssignment(form);
      toast.success("Assignment created!");
      setOpen(false);
      setForm({ title: "", description: "", dueDate: "" });
      refetch();
    } catch {
      toast.error("Failed to create assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      await deleteAssignment({ id });
      toast.success("Deleted");
      refetch();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <AppShell role="TEACHER" userName={(user as any).name || "Teacher"} pageTitle="Assignments">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Assignments</h2>
            <p className="page-subtitle">Create and manage student assignments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> New Assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input placeholder="Assignment title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="Instructions..." rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
                </div>
                <div className="flex justify-end gap-2">
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
        ) : (assignments as any[]).length === 0 ? (
          <EmptyState message="No assignments yet. Create your first one!" />
        ) : (
          <div className="space-y-3">
            {(assignments as any[]).map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{a.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" /> Due {formatDate(a.dueDate)}
                        </span>
                        <Badge variant="secondary">{a._count?.submissions ?? 0} submitted</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/teacher/assignments/${a.id}`}><Eye className="h-3 w-3" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}>
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
