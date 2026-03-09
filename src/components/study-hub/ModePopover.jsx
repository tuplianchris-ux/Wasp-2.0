import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Brain, Layers } from "lucide-react";

const MODES = [
  { id: "summarize", label: "Summarize", icon: FileText },
  { id: "quiz", label: "Quiz", icon: Brain },
  { id: "flashcards", label: "Flashcards", icon: Layers },
];

export default function ModePopover({ open, onClose, value, onChange, anchorRef }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="rounded-xl border border-hub-border bg-hub-elevated py-1 shadow-xl"
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              onChange(mode.id);
              onClose();
            }}
            className={`flex w-full items-center gap-3 px-4 py-2.5 font-hub-sans text-sm transition ${
              isActive ? "bg-hub-accent/15 text-hub-accent" : "text-hub-text hover:bg-hub-elevated"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {mode.label}
          </button>
        );
      })}
    </motion.div>
  );
}

export { MODES };
