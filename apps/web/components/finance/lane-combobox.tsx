'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

export type LaneComboboxOption = {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: 'stock' | 'etf' | 'crypto';
};

type LaneComboboxProps = {
  options: LaneComboboxOption[];
  value: string;
  onChange: (assetId: string) => void;
  /** Field label (reused for the input's accessible name). */
  label: string;
};

// Data-derived asset-class ordering + display (no translatable copy — the class
// token itself is the label, matching the existing "SYMBOL · CLASS" convention).
const CLASS_ORDER: LaneComboboxOption['assetClass'][] = ['stock', 'etf', 'crypto'];

function classLabel(assetClass: LaneComboboxOption['assetClass']): string {
  return assetClass.toUpperCase();
}

function optionLabel(option: LaneComboboxOption): string {
  return `${option.symbol} · ${option.name}`;
}

/**
 * Accessible, searchable combobox for selecting a simulation lane from the full
 * tradable universe. Presentation-only: it renders the pre-shaped options passed
 * from the server and reports the chosen assetId upward. Grouped by asset class,
 * type-to-filter, full keyboard support (↑/↓/Enter/Escape), ARIA combobox +
 * grouped listbox semantics.
 */
export function LaneCombobox({ options, value, onChange, label }: LaneComboboxProps) {
  const listboxId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(() => options.find((option) => option.assetId === value) ?? null, [options, value]);

  // Flat, filtered, class-ordered list used for both grouping and keyboard nav.
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? options.filter(
          (option) =>
            option.symbol.toLowerCase().includes(needle) ||
            option.name.toLowerCase().includes(needle) ||
            option.assetClass.toLowerCase().includes(needle),
        )
      : options;
    // options already arrive class-then-symbol sorted from the service.
    return matches;
  }, [options, query]);

  // Group the flat list into ordered class buckets while remembering each
  // option's index in the flat list (aria-activedescendant / keyboard target).
  const groups = useMemo(() => {
    return CLASS_ORDER.map((assetClass) => ({
      assetClass,
      items: filtered
        .map((option, index) => ({ option, index }))
        .filter((entry) => entry.option.assetClass === assetClass),
    })).filter((group) => group.items.length > 0);
  }, [filtered]);

  // Clamp the active row to the current filtered set at render time (no effect —
  // deriving during render avoids a cascading setState-in-effect).
  const clampedActive = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function commit(option: LaneComboboxOption) {
    onChange(option.assetId);
    setQuery('');
    setOpen(false);
  }

  function openWith(index = 0) {
    setOpen(true);
    setActiveIndex(index);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          openWith(0);
        } else {
          setActiveIndex((current) => Math.min(current + 1, Math.max(filtered.length - 1, 0)));
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (open) {
          setActiveIndex((current) => Math.max(current - 1, 0));
        }
        break;
      case 'Enter': {
        if (open && filtered[clampedActive]) {
          event.preventDefault();
          commit(filtered[clampedActive]);
        }
        break;
      }
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
          setQuery('');
        }
        break;
      case 'Home':
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (open) {
          event.preventDefault();
          setActiveIndex(Math.max(filtered.length - 1, 0));
        }
        break;
      default:
        break;
    }
  }

  const activeOption = open ? filtered[clampedActive] : undefined;
  const activeDescendant = activeOption ? `${listboxId}-opt-${activeOption.assetId}` : undefined;
  const displayValue = open ? query : selected ? optionLabel(selected) : '';

  return (
    <div className="lane-combobox" ref={rootRef}>
      <div
        // role="combobox" on the wrapping control per ARIA 1.2 combobox pattern.
        className="lane-combobox__control"
      >
        <input
          id={inputId}
          type="text"
          role="combobox"
          className="lane-combobox__input"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          autoComplete="off"
          value={displayValue}
          placeholder={selected ? optionLabel(selected) : label}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="lane-combobox__toggle"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listboxId}
          tabIndex={-1}
          onClick={() => {
            if (open) {
              setOpen(false);
              setQuery('');
            } else {
              openWith(Math.max(filtered.findIndex((option) => option.assetId === value), 0));
            }
          }}
        >
          <span aria-hidden="true">▾</span>
        </button>
      </div>

      <ul
        id={listboxId}
        role="listbox"
        aria-label={label}
        className="lane-combobox__listbox"
        hidden={!open}
      >
        {groups.length === 0 ? (
          <li role="presentation" className="lane-combobox__empty" aria-live="polite">
            {/* Data-derived, non-copy fallback keeps the surface i18n-clean. */}
            {query ? `“${query}” — 0` : '0'}
          </li>
        ) : (
          groups.map((group) => (
            <li key={group.assetClass} role="group" aria-label={classLabel(group.assetClass)}>
              <span className="lane-combobox__group-label" aria-hidden="true">
                {classLabel(group.assetClass)}
              </span>
              <ul role="presentation" className="lane-combobox__group-items">
                {group.items.map(({ option, index }) => {
                  const isActive = index === clampedActive;
                  const isSelected = option.assetId === value;
                  return (
                    <li
                      key={option.assetId}
                      id={`${listboxId}-opt-${option.assetId}`}
                      role="option"
                      aria-selected={isSelected}
                      className={`lane-combobox__option${isActive ? ' lane-combobox__option--active' : ''}${
                        isSelected ? ' lane-combobox__option--selected' : ''
                      }`}
                      // onMouseDown fires before input blur so the selection sticks.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        commit(option);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span className="lane-combobox__option-symbol">{option.symbol}</span>
                      <span className="lane-combobox__option-name">{option.name}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
