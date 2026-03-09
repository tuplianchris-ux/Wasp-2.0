import { useState, useCallback, useContext } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Sparkles, PlusCircle, History } from "lucide-react";
import { AuthContext, API } from "../App";
import ChatArea from "../components/study-hub/ChatArea";
import ChatInputBar from "../components/study-hub/ChatInputBar";
import { callAnthropic } from "../components/study-hub/anthropicClient";

const DEFAULT_SUMMARIZE = { agent: "deep", summaryStyle: "Concise", summaryLength: "Medium" };
const DEFAULT_QUIZ = { agent: "deep", questionType: "multiple_choice", numQuestions: 5, difficulty: "Medium" };
const DEFAULT_FLASHCARDS = { agent: "deep", numCards: 10, cardStyle: "term_def" };

let messageId = 0;
let attachmentId = 0;

export default function StudyHub() {
  const { token } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("summarize");
  const [options, setOptions] = useState({
    summarize: DEFAULT_SUMMARIZE,
    quiz: DEFAULT_QUIZ,
    flashcards: DEFAULT_FLASHCARDS,
  });
  const [attachments, setAttachments] = useState([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const getOptionsForMode = useCallback(() => {
    if (mode === "summarize") return options.summarize;
    if (mode === "quiz") return options.quiz;
    return options.flashcards;
  }, [mode, options]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setAttachments([]);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && !attachments.length) return;
    if (!process.env.REACT_APP_ANTHROPIC_API_KEY) {
      toast.error("Set REACT_APP_ANTHROPIC_API_KEY in .env.local");
      return;
    }

    const userMsg = {
      id: `msg-${++messageId}`,
      role: "user",
      mode,
      content: text,
      attachments: [...attachments],
    };
    const loadingId = `msg-${++messageId}`;
    const loadingMsg = {
      id: loadingId,
      role: "assistant",
      mode,
      loading: true,
      content: null,
      data: null,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setAttachments([]);
    setIsGenerating(true);

    try {
      const opts = getOptionsForMode();
      const result = await callAnthropic(mode, opts, text, attachments);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                loading: false,
                content: result.type === "summary" ? result.data : null,
                data: result.data,
                error: null,
              }
            : m
        )
      );
      toast.success("Done!");
    } catch (err) {
      const message = err?.message || "Request failed.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId ? { ...m, loading: false, error: message, content: null, data: null } : m
        )
      );
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [input, attachments, mode, getOptionsForMode]);

  const handleRegenerateMessage = useCallback(
    async (assistantMessageId) => {
      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      if (idx <= 0) return;
      const prevMsg = messages[idx - 1];
      if (prevMsg.role !== "user") return;
      if (!process.env.REACT_APP_ANTHROPIC_API_KEY) {
        toast.error("Set REACT_APP_ANTHROPIC_API_KEY in .env.local");
        return;
      }

      const loadingId = `msg-${++messageId}`;
      const loadingMsg = {
        id: loadingId,
        role: "assistant",
        mode: prevMsg.mode || mode,
        loading: true,
        content: null,
        data: null,
      };

      setMessages((prev) => {
        const next = [...prev];
        next[idx] = loadingMsg;
        return next;
      });
      setIsGenerating(true);

      const currentMode = prevMsg.mode || mode;
      const opts = currentMode === "summarize" ? options.summarize : currentMode === "quiz" ? options.quiz : options.flashcards;

      try {
        const result = await callAnthropic(currentMode, opts, prevMsg.content, prevMsg.attachments || []);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  loading: false,
                  content: result.type === "summary" ? result.data : null,
                  data: result.data,
                  error: null,
                }
              : m
          )
        );
        toast.success("Regenerated!");
      } catch (err) {
        const message = err?.message || "Request failed.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId ? { ...m, loading: false, error: message, content: null, data: null } : m
          )
        );
        toast.error(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [messages, mode, options]
  );

  const handleCopy = useCallback(() => toast.success("Copied to clipboard."), []);

  const handleDownload = useCallback((text) => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-hub-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded.");
  }, []);

  const handleSave = useCallback(
    async (type, content) => {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const sourceText = lastUser?.content?.slice(0, 500) || "";
      const title = `${type} — ${new Date().toLocaleDateString()}`;
      const payload =
        type === "summary"
          ? { item_type: "summary", title, content, source_text: sourceText }
          : type === "quiz"
          ? { item_type: "quiz", title, content: typeof content === "object" ? JSON.stringify(content) : content, source_text: sourceText }
          : { item_type: "flashcards", title, content: typeof content === "object" ? JSON.stringify(content) : content, source_text: sourceText };

      try {
        await axios.post(`${API}/library`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        toast.success("Saved to Library! +5 XP");
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Failed to save.");
      }
    },
    [messages, token]
  );

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  const handleOptionsChange = useCallback((key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleImageSelect = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const mediaType = file.type || "image/png";
      setAttachments((a) => [
        ...a,
        { id: ++attachmentId, type: "image", name: file.name, data: data.replace(/^data:[^;]+;base64,/, ""), mediaType },
      ]);
      toast.success("Image added.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = useCallback((file) => {
    if (file.type.startsWith("image/")) {
      handleImageSelect(file);
      return;
    }
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments((a) => [...a, { id: ++attachmentId, type: "file", name: file.name, text: e.target.result }]);
        setInput((c) => (c ? c + "\n\n" : "") + e.target.result);
        toast.success("File added.");
      };
      reader.readAsText(file);
      return;
    }
    toast.error("Upload a .txt file or an image.");
  }, [handleImageSelect]);

  const handleLinkAdd = useCallback((url) => {
    setAttachments((a) => [...a, { id: ++attachmentId, type: "link", url }]);
    toast.success("Link noted — Claude will reference it based on context.");
  }, []);

  const handleRemoveAttachment = useCallback((index) => {
    setAttachments((a) => a.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="study-hub flex flex-1 flex-col overflow-hidden bg-hub-bg font-hub-sans text-hub-text min-h-0">
        <header className="flex shrink-0 items-center justify-between border-b border-hub-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-hub-accent" />
            <span className="font-hub-sans text-lg font-semibold">Study Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetChat}
              className="flex items-center gap-2 rounded-xl border border-hub-border bg-hub-surface px-3 py-2 font-hub-sans text-sm text-hub-muted transition hover:bg-hub-elevated hover:text-hub-text"
            >
              <PlusCircle className="h-4 w-4" />
              New Chat
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-hub-border bg-hub-surface px-3 py-2 font-hub-sans text-sm text-hub-muted transition hover:bg-hub-elevated hover:text-hub-text"
              aria-label="History"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </header>

        <ChatArea
          messages={messages}
          onRegenerateMessage={handleRegenerateMessage}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onSave={handleSave}
        />

        <div className="shrink-0">
          <ChatInputBar
            mode={mode}
            onModeChange={handleModeChange}
            options={options}
            onOptionsChange={handleOptionsChange}
            attachments={attachments}
            onRemoveAttachment={handleRemoveAttachment}
            onFileSelect={handleFileSelect}
            onImageSelect={handleImageSelect}
            onLinkAdd={handleLinkAdd}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            disabled={isGenerating}
          />
        </div>
    </div>
  );
}
