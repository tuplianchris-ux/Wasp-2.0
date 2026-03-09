import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

const FILE_ACCEPT = ".pdf,.txt,.docx,image/*";
const IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp";

export default function AttachMenu({
  open,
  onClose,
  anchorRef,
  onFileSelect,
  onImageSelect,
  onLinkAdd,
}) {
  const ref = useRef(null);
  const [linkUrl, setLinkUrl] = useState("");

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

  const handleLinkSubmit = () => {
    const url = linkUrl.trim();
    if (url) {
      onLinkAdd(url);
      setLinkUrl("");
      onClose();
    }
  };

  if (!open) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="rounded-xl border border-hub-border bg-hub-elevated py-1 shadow-xl"
    >
      <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 font-hub-sans text-sm text-hub-text transition hover:bg-hub-elevated">
        <Paperclip className="h-4 w-4 shrink-0 text-hub-muted" />
        Upload File
        <input
          type="file"
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
            e.target.value = "";
          }}
        />
      </label>
      <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 font-hub-sans text-sm text-hub-text transition hover:bg-hub-elevated">
        <ImageIcon className="h-4 w-4 shrink-0 text-hub-muted" />
        Upload Image
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageSelect(file);
            e.target.value = "";
          }}
        />
      </label>
      <div className="border-t border-hub-border px-4 py-2">
        <div className="flex gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
            placeholder="Paste URL..."
            className="flex-1 rounded-lg border border-hub-border bg-hub-bg px-3 py-1.5 font-hub-sans text-sm text-hub-text placeholder-hub-dimmed outline-none focus:ring-2 focus:ring-hub-accent/40"
          />
          <button
            type="button"
            onClick={handleLinkSubmit}
            className="rounded-lg bg-hub-accent px-3 py-1.5 font-hub-sans text-sm font-medium text-white hover:opacity-90"
          >
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}
