type TimeframeSwitcherProps = {
  items: string[];
  active: string;
};

export function TimeframeSwitcher({ items, active }: TimeframeSwitcherProps) {
  return (
    <div className="control-group" role="tablist" aria-label="Timeframe">
      {items.map((item) => (
        <button key={item} type="button" className={item === active ? 'control-pill control-pill--active' : 'control-pill'}>
          {item}
        </button>
      ))}
    </div>
  );
}
