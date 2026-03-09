import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getLibraryItems, createLibraryItem, deleteLibraryItem } from "wasp/client/operations";
import { toast } from "sonner";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Plus, Loader2, Trash2, ExternalLink, FileText, Link2 } from "lucide-react";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { EmptyState } from "../../components/shared/EmptyState";
import { formatDate } from "../../lib/utils";
import { motion } from "framer-motion";

export function TeacherLibraryPage({ user }: { user: AuthUser }) {
  const { data: items = [], isLoading, refetch } = useQuery(getLibraryItems);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "link", url: "", tagsInput: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = form.tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await createLibraryItem({ title: form.title, type: form.type, url: form.url, tags });
      toast.success("Item added!");
      setOpen(false);
      setForm({ title: "", type: "link", url: "", tagsInput: "" });
      refetch();
    } catch {
      toast.error("Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLibraryItem({ id });
      toast.success("Removed");
      refetch();
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <AppShell role="TEACHER" userName={(user as any).name || "Teacher"} pageTitle="Library">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">Library</h2>
            <p className="page-subtitle">Manage shared resources for students</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Add Resource</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Library Resource</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input placeholder="Resource name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="file">File URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>URL</Label>
                  <Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Tags (comma-separated)</Label>
                  <Input placeholder="math, algebra, chapter-5" value={form.tagsInput} onChange={(e) => setForm({ ...form, tagsInput: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (items as any[]).length === 0 ? (
          <EmptyState message="No resources yet." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(items as any[]).map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-4 flex flex-col h-full gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {item.type === "link" ? <Link2 className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">Added {formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(item.tags as string[]).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> Open
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
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
