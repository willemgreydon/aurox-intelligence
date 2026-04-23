type InsightCalloutProps = {
  title: string;
  body: string;
};

export function InsightCallout({ title, body }: InsightCalloutProps) {
  return (
    <aside className="analytics-card analytics-card--callout">
      <div className="analytics-stat__label">Insight callout</div>
      <h3>{title}</h3>
      <p className="analytics-stat__detail">{body}</p>
    </aside>
  );
}
