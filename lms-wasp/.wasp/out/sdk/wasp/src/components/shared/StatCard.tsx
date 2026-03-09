import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export function StatCard({ label, value, icon: Icon, color, bg }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div
          className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}
        >
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <p
        className="text-3xl font-bold mt-2"
        style={{ fontFamily: "Sora, sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}
