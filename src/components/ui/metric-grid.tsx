type MetricItem = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricGrid({ items }: { items: MetricItem[] }) {
  return (
    <div className="metric-grid">
      {items.map((item) => (
        <div className="metric" key={item.label}>
          <div className="metric__label">{item.label}</div>
          <div className="metric__value">{item.value}</div>
          {item.hint ? <div className="metric__hint">{item.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}
