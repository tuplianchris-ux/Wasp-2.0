import { motion } from "framer-motion";
import { cn, gradeColor, gradeLabel } from "../../lib/utils";

interface GradeDisplayProps {
  score: number;
  feedback?: string;
  maxScore?: number;
}

export function GradeDisplay({ score, feedback, maxScore = 100 }: GradeDisplayProps) {
  const percentage = Math.round((score / maxScore) * 100);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Score</span>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className={cn("text-3xl font-bold", gradeColor(percentage))}
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          {percentage}%
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              percentage >= 90 ? "bg-emerald-500" :
              percentage >= 75 ? "bg-teal-500" :
              percentage >= 60 ? "bg-amber-500" : "bg-red-500"
            )}
          />
        </div>
        <span
          className={cn("text-lg font-bold min-w-[2rem] text-right", gradeColor(percentage))}
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          {gradeLabel(percentage)}
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        {score} / {maxScore} points
      </div>

      {feedback && (
        <div className="border-t pt-3 mt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Feedback
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">{feedback}</p>
        </div>
      )}
    </div>
  );
}
