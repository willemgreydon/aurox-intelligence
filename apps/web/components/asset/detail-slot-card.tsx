type DetailSlotCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
};

export function DetailSlotCard({ eyebrow, title, description, items }: DetailSlotCardProps) {
  return (
    <article className="surface detail-slot-card">
      <div className="surface__inner detail-slot-card__inner">
        <header className="detail-slot-card__header">
          <div className="detail-slot-card__eyebrow">{eyebrow}</div>
          <h3 className="detail-slot-card__title">{title}</h3>
          <p className="detail-slot-card__description">{description}</p>
        </header>

        <ul className="detail-slot-card__list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
