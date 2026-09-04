import { Inbox } from "lucide-react";

export function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <Inbox size={28} strokeWidth={1.8} />
      <strong>{title}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}
