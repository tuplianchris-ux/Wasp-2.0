import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useRoomPresence } from "./useStudyRoom";

const SUBJECT_TAG_COLORS = {
  Math: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  Science: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  English: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  "SAT/ACT": "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Other: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
};

export default function RoomTopBar({ roomName, tag, onLeave }) {
  const navigate = useNavigate();
  const { self, others, myColor, updateMyPresence } = useRoomPresence();

  const handleLeave = () => {
    onLeave?.();
    navigate("/community");
  };

  const tagStyle = SUBJECT_TAG_COLORS[tag] || SUBJECT_TAG_COLORS.Other;
  const allMembers = [
    ...(self ? [{ ...(self.presence || {}), connectionId: self.connectionId, isSelf: true }] : []),
    ...others.map((o) => ({ ...(o.presence || {}), connectionId: o.connectionId, isSelf: false })),
  ].filter((m) => m?.name || m?.userId || m?.connectionId);

  return (
    <motion.header
      className="flex items-center justify-between h-14 px-4 border-b border-border bg-card/95 backdrop-blur shrink-0"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-heading font-semibold truncate text-foreground">
          {roomName || "Study Room"}
        </span>
        {tag && (
          <span
            className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium border ${tagStyle}`}
          >
            {tag}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5" title="Members present">
          <Users className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex -space-x-2">
            {allMembers.slice(0, 5).map((member, i) => (
              <Avatar
                key={member.connectionId ?? i}
                className="h-8 w-8 border-2 border-background ring-1 ring-border"
                style={{ zIndex: 5 - i }}
              >
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback
                  className="text-xs"
                  style={{
                    backgroundColor: member.color || myColor,
                    color: "#fff",
                  }}
                >
                  {(member.name || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {allMembers.length > 5 && (
            <span className="text-xs text-muted-foreground pl-1">
              +{allMembers.length - 5}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLeave}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Leave Room
        </Button>
      </div>
    </motion.header>
  );
}
