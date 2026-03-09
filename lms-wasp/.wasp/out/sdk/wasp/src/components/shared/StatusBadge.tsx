import { Badge } from "../ui/badge";

type Status = "pending" | "submitted" | "graded";

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const labels: Record<Status, string> = {
    pending: "Pending",
    submitted: "Submitted",
    graded: "Graded",
  };

  const variants: Record<Status, "pending" | "submitted" | "graded"> = {
    pending: "pending",
    submitted: "submitted",
    graded: "graded",
  };

  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
