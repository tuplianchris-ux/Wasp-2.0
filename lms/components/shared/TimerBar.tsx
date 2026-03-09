"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimerBarProps {
  durationMinutes: number;
  onExpire?: () => void;
}

export function TimerBar({ durationMinutes, onExpire }: TimerBarProps) {
  const totalSeconds = durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire?.();
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const percentage = (secondsLeft / totalSeconds) * 100;
  const isWarning = secondsLeft <= 300; // 5 minutes
  const isDanger = secondsLeft <= 60;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className={cn(
      "rounded-lg border p-3 flex items-center gap-3 transition-colors",
      isDanger ? "border-red-500/50 bg-red-500/5" :
      isWarning ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-card"
    )}>
      <Clock className={cn(
        "h-4 w-4 shrink-0",
        isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"
      )} />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Time Remaining</span>
          <span className={cn(
            "text-sm font-mono font-bold",
            isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-foreground"
          )}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      {isWarning && (
        <span className={cn(
          "text-xs font-semibold shrink-0",
          isDanger ? "text-red-500" : "text-amber-500"
        )}>
          {isDanger ? "HURRY!" : "5 MIN"}
        </span>
      )}
    </div>
  );
}
