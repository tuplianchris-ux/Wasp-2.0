import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { PlayerAvatar } from "./shared";
import { Copy, Users, Play } from "lucide-react";
import { toast } from "sonner";

/**
 * Waiting room after Create Room or Join Room.
 * Shows join code (with copy), player list (host + bots), Start Game or countdown.
 */
export default function WaitingRoom({
  roomCode,
  players,
  isHost,
  onStart,
  onCopyLink,
}) {
  const [countdown, setCountdown] = useState(isHost ? 30 : null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isHost || countdown === null || countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isHost, countdown]);

  useEffect(() => {
    if (isHost && countdown === 0 && !started) {
      setStarted(true);
      onStart?.();
    }
  }, [isHost, countdown, started, onStart]);

  const handleCopy = () => {
    const code = roomCode?.replace(/-/g, "") || "";
    const link = `${window.location.origin}/competitions?join=${code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        toast.success("Link copied to clipboard");
      });
    } else {
      navigator.clipboard?.writeText?.(code) || window.prompt("Copy code:", code);
    }
    onCopyLink?.();
  };

  const displayCode = roomCode || "------";
  const canStart = isHost && players?.length >= 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto px-4 py-8"
    >
      <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 space-y-6">
        <div className="text-center">
          <p className="text-xs text-[#888] uppercase tracking-wider mb-1">Join code</p>
          <p className="text-3xl font-mono font-bold text-[#efefef] tracking-widest">
            {displayCode}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-white/10 text-[#888] hover:text-[#efefef]"
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4 mr-2" /> Copy link
          </Button>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[#888] text-sm mb-3">
            <Users className="w-4 h-4" />
            <span>Players ({players?.length ?? 0})</span>
          </div>
          <ul className="space-y-2">
            {(players || []).map((p, i) => (
              <motion.li
                key={p.id || i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-[#1a1a1a]"
              >
                <PlayerAvatar name={p.name} avatar={p.avatar} size="sm" />
                <span className="text-[#efefef] font-medium truncate">{p.name}</span>
                {p.isHost && (
                  <span className="text-xs text-[#6e5ff0] ml-auto">Host</span>
                )}
              </motion.li>
            ))}
          </ul>
        </div>

        {isHost && (
          <div className="pt-2">
            {countdown !== null && countdown > 0 ? (
              <p className="text-center text-[#888] text-sm">
                Game starts in <span className="font-mono font-semibold text-[#efefef]">{countdown}</span>s
                &nbsp;or when you click Start
              </p>
            ) : null}
            <Button
              className="w-full bg-[#6e5ff0] hover:bg-[#6e5ff0]/90 mt-2"
              onClick={() => {
                setStarted(true);
                onStart?.();
              }}
              disabled={!canStart || started}
            >
              <Play className="w-4 h-4 mr-2" /> Start Game
            </Button>
          </div>
        )}

        {!isHost && (
          <p className="text-center text-sm text-[#888]">Waiting for host to start the game...</p>
        )}
      </div>
    </motion.div>
  );
}
