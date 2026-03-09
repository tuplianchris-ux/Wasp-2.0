import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getMyTasks, completeTask } from "wasp/client/operations";
import { toast } from "sonner";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { CalendarDays, Loader2, CheckCircle2 } from "lucide-react";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { EmptyState } from "../../components/shared/EmptyState";
import { formatDate } from "../../lib/utils";
import { motion } from "framer-motion";

export function StudentTasksPage({ user }: { user: AuthUser }) {
  const { data: tasks = [], isLoading, refetch } = useQuery(getMyTasks);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await completeTask({ id });
      toast.success("Task completed!");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete");
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <AppShell role="STUDENT" userName={(user as any).name || "Student"} pageTitle="Tasks">
      <div className="space-y-6">
        <div>
          <h2 className="page-title">My Tasks</h2>
          <p className="page-subtitle">Tasks assigned to you</p>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (tasks as any[]).length === 0 ? (
          <EmptyState message="No tasks assigned yet" />
        ) : (
          <div className="space-y-3">
            {(tasks as any[]).map((task: any, i: number) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={task.completed ? "opacity-75 border-emerald-500/30" : ""}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleComplete(task.id)}
                        disabled={completingId === task.id}
                      >
                        {completingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark done"}
                      </Button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <CalendarDays className="h-3 w-3" /> Due {formatDate(task.dueDate)}
                        </span>
                      )}
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
