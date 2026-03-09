import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent } from "../ui/card";
import { StatusBadge } from "./StatusBadge";
import { Loader2, Save, Sparkles } from "lucide-react";
import { formatDateTime } from "../../lib/utils";

export interface SubmissionForGrading {
  id: string;
  student?: { name?: string };
  assignment?: { title?: string };
  textContent?: string | null;
  grade?: number | null;
  feedback?: string | null;
  submittedAt: Date | string;
}

interface SubmissionGradingCardProps {
  sub: SubmissionForGrading;
  grading: { grade: string; feedback: string };
  onGradingChange: (grade: string, feedback: string) => void;
  onSave: () => void;
  saving: boolean;
  showAiGrade?: boolean;
  onAiGrade?: () => void;
  aiGrading?: boolean;
}

export function SubmissionGradingCard({
  sub,
  grading,
  onGradingChange,
  onSave,
  saving,
  showAiGrade = false,
  onAiGrade,
  aiGrading = false,
}: SubmissionGradingCardProps) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{sub.student?.name}</p>
            <p className="text-xs text-muted-foreground">
              {sub.assignment?.title} · {formatDateTime(sub.submittedAt)}
            </p>
          </div>
          <StatusBadge status={sub.grade != null ? "graded" : "submitted"} />
        </div>

        {sub.textContent && (
          <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap">{sub.textContent}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Grade (0–100)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Score"
              value={grading.grade}
              onChange={(e) =>
                onGradingChange(e.target.value, grading.feedback)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Feedback</Label>
            <Input
              placeholder="Comments..."
              value={grading.feedback}
              onChange={(e) =>
                onGradingChange(grading.grade, e.target.value)
              }
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving} size="sm">
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save Grade
          </Button>
          {showAiGrade && sub.textContent && onAiGrade && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAiGrade}
              disabled={aiGrading}
            >
              {aiGrading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI Grade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
