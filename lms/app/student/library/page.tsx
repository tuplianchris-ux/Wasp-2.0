"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, FileText, Link2, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

interface LibraryItem {
  id: string;
  title: string;
  type: string;
  url: string;
  tags: string[];
  createdAt: string;
  addedBy: { name: string };
}

export default function StudentLibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); });
  }, []);

  const allTags = Array.from(new Set(items.flatMap((i) => i.tags)));

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = !filterTag || item.tags.includes(filterTag);
    return matchSearch && matchTag;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Library</h2>
        <p className="page-subtitle">Browse shared resources from your teachers</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!filterTag ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterTag("")}
          >All</Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={filterTag === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed">
          <p className="text-muted-foreground">
            {items.length === 0 ? "No resources available yet" : "No results for your search"}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 flex flex-col h-full gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {item.type === "link" ? <Link2 className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">By {item.addedBy.name} · {formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterTag(tag)}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        {item.type === "link" ? "Open Link" : "Download"}
                      </a>
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
