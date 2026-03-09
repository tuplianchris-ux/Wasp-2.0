import { useRef, useState, useEffect } from "react";
import { Plus, ChevronDown, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ModePopover, { MODES } from "./ModePopover";
import StylePopover, { getStylePillLabel } from "./StylePopover";
import AttachMenu from "./AttachMenu";

const PLACEHOLDERS = {
  summarize: "Paste your notes, textbook content, or describe a topic...",
  quiz: "Paste content to generate quiz questions from...",
  flashcards: "Paste material to create flashcards from...",
};

const MODE_LABELS = Object.fromEntries(MODES.map((m) => [m.id, m.label]));

export default function ChatInputBar({
  mode,
  onModeChange,
  options,
  onOptionsChange,
  attachments,
  onRemoveAttachment,
  onFileSelect,
  onImageSelect,
  onLinkAdd,
  input,
  onInputChange,
  onSend,
  disabled,
}) {
  const modeAnchorRef = useRef(null);
  const styleAnchorRef = useRef(null);
  const attachAnchorRef = useRef(null);
  const [showModePopover, setShowModePopover] = useState(false);
  const [showStylePopover, setShowStylePopover] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const closeAll = () => {
    setShowModePopover(false);
    setShowStylePopover(false);
    setShowAttachMenu(false);
  };

  useEffect(() => {
    if (showModePopover) {
      setShowStylePopover(false);
      setShowAttachMenu(false);
    }
  }, [showModePopover]);
  useEffect(() => {
    if (showStylePopover) {
      setShowModePopover(false);
      setShowAttachMenu(false);
    }
  }, [showStylePopover]);
  useEffect(() => {
    if (showAttachMenu) {
      setShowModePopover(false);
      setShowStylePopover(false);
    }
  }, [showAttachMenu]);

  const canSend = (input?.trim() || attachments?.length) && !disabled;
  const styleLabel = getStylePillLabel(mode, options);

  return (
    <div className="border-t border-hub-border bg-hub-bg p-4">
      {attachments?.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          <AnimatePresence>
            {attachments.map((a, i) => (
              <motion.span
                key={a.id ?? i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-hub-border bg-hub-elevated px-2.5 py-1 font-hub-sans text-xs text-hub-text"
              >
                {a.name || a.url || (a.type === "image" ? "Image" : "File")}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(i)}
                  className="rounded p-0.5 text-hub-muted hover:bg-hub-elevated hover:text-hub-text"
                  aria-label="Remove"
                >
                  ×
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
      <div className="relative flex flex-wrap items-end gap-2 rounded-2xl border border-hub-border bg-hub-surface">
        <div className="relative flex shrink-0 items-center">
          <button
            ref={attachAnchorRef}
            type="button"
            onClick={() => setShowAttachMenu((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-hub-muted transition hover:bg-hub-elevated hover:text-hub-text"
            aria-label="Attach"
          >
            <Plus className="h-5 w-5" />
          </button>
          <AttachMenu
            open={showAttachMenu}
            onClose={closeAll}
            anchorRef={attachAnchorRef}
            onFileSelect={onFileSelect}
            onImageSelect={onImageSelect}
            onLinkAdd={onLinkAdd}
          />
        </div>

        <div className="relative flex shrink-0">
          <button
            ref={modeAnchorRef}
            type="button"
            onClick={() => setShowModePopover((v) => !v)}
            className="flex items-center gap-1 rounded-xl border border-hub-border bg-hub-elevated px-3 py-2 font-hub-sans text-sm text-hub-text transition hover:border-hub-border"
          >
            ✦ {MODE_LABELS[mode] || "Summarize"}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>
          <ModePopover
            open={showModePopover}
            onClose={closeAll}
            value={mode}
            onChange={onModeChange}
            anchorRef={modeAnchorRef}
          />
        </div>

        <div className="relative flex shrink-0">
          <button
            ref={styleAnchorRef}
            type="button"
            onClick={() => setShowStylePopover((v) => !v)}
            className="flex items-center gap-1 rounded-xl border border-hub-border bg-hub-elevated px-3 py-2 font-hub-sans text-sm text-hub-text transition hover:border-hub-border"
          >
            {styleLabel}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>
          <StylePopover
            open={showStylePopover}
            onClose={closeAll}
            mode={mode}
            options={options}
            onChange={onOptionsChange}
            anchorRef={styleAnchorRef}
          />
        </div>

        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          placeholder={PLACEHOLDERS[mode] || PLACEHOLDERS.summarize}
          rows={1}
          className="min-h-[40px] flex-1 resize-none rounded-xl border-0 bg-transparent px-3 py-2 font-hub-sans text-sm text-hub-text placeholder-hub-dimmed outline-none focus:ring-0"
          style={{ minWidth: "120px" }}
        />

        <button
          type="button"
          onClick={() => canSend && onSend()}
          disabled={!canSend}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hub-accent text-white transition hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 active:scale-95"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
