type ConfidenceMeterProps = {
  label: string;
  value: number;
};

export function ConfidenceMeter({ label, value }: ConfidenceMeterProps) {
  const width = `${Math.max(0, Math.min(100, value))}%`;

  return (
    <div className="confidence-meter" aria-label={`${label}: ${value}%`}>
      <div className="confidence-meter__header">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="confidence-meter__track">
        <div className="confidence-meter__fill" style={{ width }} />
      </div>
    </div>
  );
}
