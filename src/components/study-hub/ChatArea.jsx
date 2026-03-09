import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, FileText, Layers, Brain } from "lucide-react";
import UserMessage from "./UserMessage";
import AssistantMessage from "./AssistantMessage";

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-hub-elevated">
        <Sparkles className="h-8 w-8 text-hub-accent animate-pulse" />
      </div>
      <h2 className="font-hub-sans text-xl font-semibold text-hub-text">
        What are you studying today?
      </h2>
      <p className="mt-2 max-w-md font-hub-sans text-sm text-hub-muted">
        Paste notes, upload a file, or drop a link — then choose your study mode below.
      </p>
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: FileText, label: "Summarize", desc: "Distill any content into clear notes" },
          { icon: Brain, label: "Quiz", desc: "Test yourself with generated questions" },
          { icon: Layers, label: "Flashcards", desc: "Create a deck to review and memorize" },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="rounded-2xl border border-hub-border bg-hub-surface p-4 text-left transition hover:border-hub-border"
          >
            <Icon className="mb-2 h-5 w-5 text-hub-accent" />
            <p className="font-hub-sans font-medium text-hub-text">{label}</p>
            <p className="mt-0.5 font-hub-sans text-xs text-hub-muted">{desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function ChatArea({
  messages,
  onRegenerateMessage,
  onCopy,
  onDownload,
  onSave,
}) {
  const scrollRef = useRef(null);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    if (messages.length > prevLengthRef.current) {
      if (userScrolledUp) setShowNewMessagePill(true);
      else el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length, userScrolledUp]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setUserScrolledUp(!nearBottom);
    if (nearBottom) setShowNewMessagePill(false);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setShowNewMessagePill(false);
    setUserScrolledUp(false);
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 pb-32 pt-4"
      >
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((msg) =>
              msg.role === "user" ? (
                <UserMessage key={msg.id} message={msg} />
              ) : (
                <AssistantMessage
                  key={msg.id}
                  message={msg}
                  onRegenerate={
                    onRegenerateMessage && !msg.loading && !msg.error
                      ? () => onRegenerateMessage(msg.id)
                      : undefined
                  }
                  onCopy={onCopy}
                  onDownload={onDownload}
                  onSave={onSave}
                />
              )
            )
          )}
        </div>
      </div>
      {showNewMessagePill && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-36 left-1/2 -translate-x-1/2 rounded-full border border-hub-border bg-hub-surface px-4 py-2 font-hub-sans text-sm text-hub-muted shadow-lg transition hover:bg-hub-elevated hover:text-hub-text"
        >
          New message
        </button>
      )}
    </div>
  );
}
