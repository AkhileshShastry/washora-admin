import { STATUS_TONE } from "../../utils/statuses";

export function StatusPill({ value }) {
  const tone = STATUS_TONE[value] || "slate";

  return <span className={`status-pill status-pill--${tone}`}>{value || "Unset"}</span>;
}
