import { useEffect, useId, useRef, useState } from 'react';
import { hasEnded } from '../shared/lifecycle.js';
import type { MapObject, ObjectType } from '../shared/map.js';
import { objectPropertyValues } from './ObjectReadDetails.js';
import './object-search.css';

export const proposalLabels = ['Nytt', 'Ändrat', 'Föreslagen borttagning'] as const;
export type ProposalFilter = (typeof proposalLabels)[number];
export type ObjectSearchState = {
  query: string;
  types: string[];
  onlySelected: boolean;
  includeEnded?: boolean;
  includeRemoved?: boolean;
  proposals?: ProposalFilter[];
};
export const initialObjectSearch: ObjectSearchState = {
  query: '',
  types: [],
  onlySelected: false,
  includeEnded: false,
  includeRemoved: false,
  proposals: [],
};
export type SearchableObject = {
  object: MapObject;
  type?: ObjectType;
  removed?: boolean;
  proposal?: ProposalFilter;
  before?: MapObject | null;
  beforeType?: ObjectType;
};
const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase('sv');

/** Only this object's own readable fields participate; relationships never do. */
export function objectSearchMatch(
  object: MapObject,
  type: ObjectType | undefined,
  query: string,
  before?: MapObject | null,
  beforeType?: ObjectType,
) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { match: true, reasons: [] };
  const ownValues = objectPropertyValues(object, type);
  if (before)
    for (const [key, saved] of objectPropertyValues(before, beforeType)) {
      const current = ownValues.get(key);
      ownValues.set(key, {
        label: current?.label ?? saved.label,
        value: `${current?.value ?? ''} ${saved.value}`,
      });
    }
  const fields = [...ownValues].map(([key, field]) => ({
    ...field,
    detail: !['name', 'type', 'description'].includes(key),
  }));
  const match = words.every((word) =>
    fields.some((field) => normalize(field.value).includes(word)),
  );
  const reasons =
    match && words.length
      ? fields
          .filter(
            (field) => field.detail && words.some((word) => normalize(field.value).includes(word)),
          )
          .map((field) => field.label)
      : [];
  return { match, reasons };
}
export function objectSearchResults<T extends SearchableObject>(
  rows: T[],
  search: ObjectSearchState,
  selectedIds: string[],
) {
  return rows.filter(
    (row) =>
      (search.includeRemoved || !row.removed) &&
      (search.includeEnded || !hasEnded(row.object)) &&
      (!search.onlySelected || selectedIds.includes(row.object.id)) &&
      (!search.types.length || search.types.includes(row.object.typeId)) &&
      (!search.proposals?.length ||
        Boolean(row.proposal && search.proposals.includes(row.proposal))) &&
      objectSearchMatch(row.object, row.type, search.query, row.before, row.beforeType).match,
  );
}
export function searchRestricted(search: ObjectSearchState) {
  return Boolean(
    search.query ||
      search.types.length ||
      search.onlySelected ||
      search.includeEnded ||
      search.includeRemoved ||
      search.proposals?.length,
  );
}
export function useDraftFilterReset(
  hasProposals: boolean,
  search: ObjectSearchState,
  onChange: (next: ObjectSearchState) => void,
) {
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!hasProposals && search.proposals?.length) {
      onChange({ ...search, proposals: [] });
      setNotice('Utkastfiltret är återställt eftersom ditt utkast är tomt.');
    } else if (hasProposals) setNotice('');
  }, [hasProposals, search, onChange]);
  return notice;
}
export function ObjectSearchInput({
  search,
  onChange,
  inputRef,
  label,
  compact = false,
}: {
  search: ObjectSearchState;
  onChange: (next: ObjectSearchState) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  label: string;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className={`object-search-input${compact ? ' map-search-input' : ''}`}>
      <label htmlFor={id}>
        <span className={compact ? 'visually-hidden' : undefined}>{label}</span>
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={search.query}
          placeholder="Namn, typ eller uppgift"
          onChange={(event) => onChange({ ...search, query: event.target.value })}
        />
      </label>
      <button
        type="button"
        aria-label="Rensa sökning"
        onClick={() => {
          onChange({ ...search, query: '' });
          if (compact) inputRef?.current?.focus();
        }}
      >
        {compact ? '×' : 'Rensa sökning'}
      </button>
    </div>
  );
}
export function ObjectSearchFilters({
  search,
  onChange,
  types,
  selectedIds,
  hasProposals,
  table = false,
}: {
  search: ObjectSearchState;
  onChange: (next: ObjectSearchState) => void;
  types: ObjectType[];
  selectedIds: string[];
  hasProposals: boolean;
  table?: boolean;
}) {
  function toggle<T extends string>(values: T[], value: T) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }
  return (
    <div className="object-search-filters">
      <fieldset>
        <legend>Objekttyp</legend>
        <p>Välj en eller flera typer. Utan val visas alla typer.</p>
        <button type="button" onClick={() => onChange({ ...search, types: [] })}>
          Alla typer
        </button>
        <div>
          {[...types]
            .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
            .map((type) => (
              <label key={type.id}>
                <input
                  type="checkbox"
                  checked={search.types.includes(type.id)}
                  onChange={() => onChange({ ...search, types: toggle(search.types, type.id) })}
                />
                {type.name}
              </label>
            ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Status</legend>
        <label>
          <input
            type="checkbox"
            checked={Boolean(search.includeEnded)}
            onChange={(event) => onChange({ ...search, includeEnded: event.target.checked })}
          />
          Ta med upphörda
        </label>
        {table && (
          <label>
            <input
              type="checkbox"
              checked={Boolean(search.includeRemoved)}
              onChange={(event) => onChange({ ...search, includeRemoved: event.target.checked })}
            />
            Ta med borttagna
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={search.onlySelected}
            onChange={(event) => onChange({ ...search, onlySelected: event.target.checked })}
          />
          Bara markerade ({selectedIds.length})
        </label>
      </fieldset>
      {hasProposals && (
        <fieldset>
          <legend>Förslag i ditt utkast</legend>
          {proposalLabels.map((proposal) => (
            <label key={proposal}>
              <input
                type="checkbox"
                checked={search.proposals?.includes(proposal) ?? false}
                onChange={() =>
                  onChange({ ...search, proposals: toggle(search.proposals ?? [], proposal) })
                }
              />
              {proposal}
            </label>
          ))}
        </fieldset>
      )}
      <button
        type="button"
        onClick={() =>
          onChange(table ? initialObjectSearch : { ...initialObjectSearch, query: search.query })
        }
      >
        {table ? 'Återställ sökning och filter' : 'Återställ filter'}
      </button>
    </div>
  );
}
export function MapSearch({
  active,
  entryRequestId,
  search,
  onChange,
  onReturnToMap,
  types,
  selectedIds,
  hasProposals,
}: {
  active: boolean;
  entryRequestId: number;
  search: ObjectSearchState;
  onChange: (next: ObjectSearchState) => void;
  onReturnToMap: () => void;
  types: ObjectType[];
  selectedIds: string[];
  hasProposals: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const dialogId = useId();
  const previousEntryRequestId = useRef(entryRequestId);
  const [expanded, setExpanded] = useState(false);
  const filtersActive = searchRestricted({ ...search, query: '' });
  function closeFilters() {
    setExpanded(false);
    filterButton.current?.focus();
  }
  useEffect(() => {
    if (active && entryRequestId !== previousEntryRequestId.current) {
      setExpanded(false);
      input.current?.focus();
    }
    previousEntryRequestId.current = entryRequestId;
  }, [active, entryRequestId]);
  useEffect(() => {
    if (!active) setExpanded(false);
  }, [active]);
  useEffect(() => {
    if (!expanded || !active) return;
    title.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !dialog.current?.contains(event.target) &&
        !filterButton.current?.contains(event.target)
      ) {
        setExpanded(false);
        filterButton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [expanded, active]);
  return (
    <section
      className="map-object-search"
      aria-label="Kartans sökning och filter"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          if (expanded) closeFilters();
          else onReturnToMap();
        }
      }}
    >
      <ObjectSearchInput
        search={search}
        onChange={onChange}
        inputRef={input}
        label="Sök objekt i kartan"
        compact
      />
      <div className="map-search-filter">
        <button
          ref={filterButton}
          type="button"
          aria-label={filtersActive ? 'Filter · aktiva' : 'Filter'}
          aria-expanded={expanded}
          aria-controls={dialogId}
          aria-haspopup="dialog"
          onClick={() => {
            if (expanded) closeFilters();
            else setExpanded(true);
          }}
        >
          Filter
          {filtersActive && (
            <span className="map-filter-dot" aria-hidden="true">
              ●
            </span>
          )}
        </button>
        <div
          ref={dialog}
          id={dialogId}
          role="dialog"
          aria-labelledby={`${dialogId}-title`}
          className="map-filter-dialog"
          hidden={!expanded}
        >
          <header>
            <h2 ref={title} id={`${dialogId}-title`} tabIndex={-1}>
              Kartans filter
            </h2>
            <button type="button" aria-label="Stäng filter" onClick={closeFilters}>
              ×
            </button>
          </header>
          <ObjectSearchFilters
            search={search}
            onChange={onChange}
            types={types}
            selectedIds={selectedIds}
            hasProposals={hasProposals}
          />
        </div>
      </div>
    </section>
  );
}

export function MapSearchContext({
  search,
  onChange,
  notice,
  contextCount,
  hiddenEnded,
  explored,
  onReturnToHits,
}: {
  search: ObjectSearchState;
  onChange: (next: ObjectSearchState) => void;
  notice: string;
  contextCount: number;
  hiddenEnded: boolean;
  explored: boolean;
  onReturnToHits: () => void;
}) {
  return (
    <aside
      className="map-search-context"
      aria-label="Kartans sökresultat"
      hidden={!contextCount && !hiddenEnded && !explored && !notice}
    >
      {contextCount > 0 && <p>{contextCount} objekt visas som sammanhang, utöver sökträffarna.</p>}
      {hiddenEnded && (
        <p>
          Upphörda objekt eller samband döljs.{' '}
          <button type="button" onClick={() => onChange({ ...search, includeEnded: true })}>
            Ta med upphörda
          </button>
        </p>
      )}
      {explored && (
        <button type="button" onClick={onReturnToHits}>
          Tillbaka till sökträffarna
        </button>
      )}
      <p role="status">{notice}</p>
    </aside>
  );
}
