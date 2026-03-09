import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { XPFloatAnimation, StreakCounter } from "./shared";
import { cn } from "../../lib/utils";

const ROUND_TIME_SEC = 25;
const CORRECT_XP = 10;
const STREAK_BONUS_PER = 5;
const SPEED_BONUS_MAX = 5;
const GAME_COMPLETION_XP = 25;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VocabJamGame({
  questions,
  currentIndex,
  score,
  streak,
  onAnswer,
  onComplete,
  addXP,
  addCoins,
}) {
  const [remaining, setRemaining] = useState(ROUND_TIME_SEC);
  const [selected, setSelected] = useState(null);
  const [floatingXP, setFloatingXP] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'
  const [answered, setAnswered] = useState(false);

  const card = questions?.[currentIndex];
  const total = questions?.length ?? 0;
  const isLast = currentIndex >= total - 1;

  const options = card
    ? shuffle([card.definition, ...(card.distractors || []).slice(0, 3)])
    : [];

  const tick = useCallback(() => {
    setRemaining((r) => {
      if (r <= 1) {
        if (!answered) {
          setAnswered(true);
          setFeedback("timeout");
          setTimeout(() => {
            if (isLast) {
              addXP(GAME_COMPLETION_XP);
              addCoins(5);
              onComplete?.({ score, streak });
            } else {
              onAnswer?.({ correct: false, skipped: true });
            }
          }, 600);
        }
        return 0;
      }
      return r - 1;
    });
  }, [answered, isLast, score, streak, onAnswer, onComplete, addXP, addCoins]);

  useEffect(() => {
    if (!card || answered) return;
    setRemaining(ROUND_TIME_SEC);
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, card?.term, answered, tick]);

  const handleSelect = (option) => {
    if (answered) return;
    setAnswered(true);
    setSelected(option);
    const correct = option === card.definition;
    setFeedback(correct ? "correct" : "wrong");

    if (correct) {
      const roundStart = ROUND_TIME_SEC - remaining;
      const speedBonus = roundStart <= 5 ? SPEED_BONUS_MAX : Math.max(1, 6 - Math.floor(roundStart / 4));
      const streakBonus = (streak + 1) * STREAK_BONUS_PER;
      const xpGain = CORRECT_XP + speedBonus + streakBonus;
      setFloatingXP(xpGain);
      addXP(xpGain);
      addCoins(1);
      setTimeout(() => {
        if (isLast) {
          addXP(GAME_COMPLETION_XP);
          addCoins(5);
          onComplete?.({ score: score + xpGain, streak: streak + 1 });
        } else {
          onAnswer?.({ correct: true, xp: xpGain, newStreak: streak + 1 });
        }
      }, 800);
    } else {
      setTimeout(() => {
        if (isLast) {
          addXP(GAME_COMPLETION_XP);
          onComplete?.({ score, streak: 0 });
        } else {
          onAnswer?.({ correct: false, newStreak: 0 });
        }
      }, 800);
    }
  };

  if (!card) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <span className="text-[#888] text-sm">
          Round {currentIndex + 1} of {total}
        </span>
        <div className="flex items-center gap-4">
          <div
            className="h-2 flex-1 min-w-[80px] max-w-[120px] rounded-full bg-[#1a1a1a] overflow-hidden"
            style={{ width: (remaining / ROUND_TIME_SEC) * 100 + "%" }}
          >
            <motion.div
              className="h-full bg-[#6e5ff0]"
              initial={{ width: "100%" }}
              animate={{ width: (remaining / ROUND_TIME_SEC) * 100 + "%" }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-sm font-mono text-[#efefef] w-8">{remaining}s</span>
        </div>
        <div className="flex items-center gap-2">
          <StreakCounter count={streak} />
        </div>
        <span className="text-sm text-[#f59e0b]">XP: +{score}</span>
      </div>

      {/* Term card */}
      <div className="relative mb-8 flex justify-center">
        <XPFloatAnimation xpGain={floatingXP} className="top-0 left-1/2 -translate-x-1/2" />
        <motion.div
          key={card.term}
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: feedback === "correct" ? 1.05 : 1,
            x: feedback === "wrong" ? [0, -10, 10, -10, 10, 0] : 0,
          }}
          transition={
            feedback === "wrong"
              ? { x: { duration: 0.4 }, scale: { duration: 0.2 } }
              : { duration: 0.2 }
          }
          className={cn(
            "w-full max-w-md rounded-2xl border-2 p-6 text-center text-xl font-semibold text-[#efefef]",
            "bg-[#1a1a1a] border-white/10",
            feedback === "correct" && "border-[#3ecf8e] bg-[#3ecf8e]/10",
            feedback === "wrong" && "border-[#f87171] bg-[#f87171]/10"
          )}
        >
          {card.term}
        </motion.div>
      </div>

      {/* Definition options */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <motion.button
            key={opt}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            disabled={answered}
            onClick={() => handleSelect(opt)}
            className={cn(
              "rounded-xl border-2 p-4 text-left text-sm font-medium transition-all min-h-[80px]",
              "bg-[#1a1a1a] border-white/10 text-[#efefef]",
              "hover:border-[#6e5ff0]/50 hover:bg-[#6e5ff0]/10 disabled:pointer-events-none",
              selected === opt && opt === card.definition && "border-[#3ecf8e] bg-[#3ecf8e]/10",
              selected === opt && opt !== card.definition && "border-[#f87171] bg-[#f87171]/10"
            )}
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function VocabJamResults({ score, totalRounds, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto px-4 py-12 text-center"
    >
      <h2 className="text-2xl font-bold text-[#efefef] mb-2">Round complete</h2>
      <p className="text-[#888] mb-6">You earned {score} XP this game.</p>
      <Button onClick={onBack} className="bg-[#6e5ff0] hover:bg-[#6e5ff0]/90">
        Back to Lobby
      </Button>
    </motion.div>
  );
}
