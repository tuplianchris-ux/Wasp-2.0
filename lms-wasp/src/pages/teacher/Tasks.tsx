import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getTasks, getStudents, createTask, updateTask, deleteTask } from "wasp/client/operations";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Plus, Loader2, Trash2, CalendarDays, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { EmptyState } from "../../components/shared/EmptyState";
import { formatDate } from "../../lib/utils";
import { motion } from "framer-motion";

export function TeacherTasksPage({ user }: { user: AuthUser }) {
  const { data: tasks = [], isLoading, refetch } = useQuery(getTasks);
  const { data: students = [] } = useQuery(getStudents);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", userId: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId) { toast.error("Select a student"); return; }
    setSaving(true);
    try {
      await createTask({
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate || undefined,
        userId: form.userId,
      });
      toast.success("Task created!");
      setOpen(false);
      setForm({ title: "", description: "", dueDate: "", userId: "" });
      refetch();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (task: any) => {
    try {
      await updateTask({ id: task.id, completed: !task.completed });
      refetch();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await deleteTask({ id });
      toast.success("Deleted");
      refetch();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <AppShell role="TEACHER" userName={(user as any).name || "Teacher"} pageTitle="Tasks">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Tasks</h2>
            <p className="page-subtitle">Create and assign tasks to students</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> New Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea placeholder="Details..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date (optional)</Label>
                  <Input type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Assign to student</Label>
                  <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })} required>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {(students as any[]).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name || "Unnamed"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        ) : (tasks as any[]).length === 0 ? (
          <EmptyState message="No tasks yet. Create one and assign to a student." />
        ) : (
          <div className="space-y-3">
            {(tasks as any[]).map((task: any, i: number) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={task.completed ? "opacity-75" : ""}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Switch
                      checked={task.completed}
                      onCheckedChange={() => handleToggleComplete(task)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary">{task.assignedTo?.name ?? "—"}</Badge>
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" /> Due {formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(task.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
