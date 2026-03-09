interface EmptyStateProps {
  message: string;
  className?: string;
}

export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div
      className={`text-center py-16 rounded-xl border border-dashed ${className ?? ""}`}
    >
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
