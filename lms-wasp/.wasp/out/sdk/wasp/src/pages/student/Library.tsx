import { useQuery } from "wasp/client/operations";
import { getLibraryItems } from "wasp/client/operations";
import type { AuthUser } from "wasp/auth";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Loader2, ExternalLink, FileText, Link2 } from "lucide-react";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { EmptyState } from "../../components/shared/EmptyState";
import { formatDate } from "../../lib/utils";
import { motion } from "framer-motion";

export function StudentLibraryPage({ user }: { user: AuthUser }) {
  const { data: items = [], isLoading } = useQuery(getLibraryItems);

  return (
    <AppShell role="STUDENT" userName={(user as any).name || "Student"} pageTitle="Library">
      <div className="space-y-6">
        <div>
          <h2 className="page-title">Library</h2>
          <p className="page-subtitle">Access shared resources from your teacher</p>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (items as any[]).length === 0 ? (
          <EmptyState message="No resources available yet" />
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
                      {(item.tags as string[]).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                    <Button asChild variant="outline" size="sm" className="mt-auto">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" /> Open Resource
                      </a>
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
