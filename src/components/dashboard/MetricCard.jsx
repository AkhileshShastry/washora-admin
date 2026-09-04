export function MetricCard({ label, value, detail, tone = "blue", icon: Icon }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
      {Icon ? (
        <span className="metric-card__icon">
          <Icon size={22} strokeWidth={1.9} />
        </span>
      ) : null}
    </article>
  );
}
