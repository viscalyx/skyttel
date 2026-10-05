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
/** Replace pending results so rapid typing never queues stale counts. */
export function SearchResultStatus({
  count,
  active = true,
  notice = '',
}: {
  count: number;
  active?: boolean;
  notice?: string;
}) {
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    setSpoken('');
    if (!active) return;
    const timer = window.setTimeout(
      () => setSpoken(`${count} träffar.${notice ? ` ${notice}` : ''}`),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [count, active, notice]);
  return (
    <>
      <p>
        {count} träffar{notice ? ` · ${notice}` : ''}
      </p>
      <span className="visually-hidden" role="status" aria-atomic="true">
        {spoken}
      </span>
    </>
  );
}
export function ObjectSearchInput({
  search,
  onChange,
  inputRef,
  label,
}: {
  search: ObjectSearchState;
  onChange: (next: ObjectSearchState) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  label: string;
}) {
  const id = useId();
  return (
    <div className="object-search-input">
      <label htmlFor={id}>
        {label}
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={search.query}
          placeholder="Namn, typ eller uppgift"
          onChange={(event) => onChange({ ...search, query: event.target.value })}
        />
      </label>
      <button type="button" onClick={() => onChange({ ...search, query: '' })}>
        Rensa sökning
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
      <button type="button" onClick={() => onChange(initialObjectSearch)}>
        Återställ sökning och filter
      </button>
    </div>
  );
}
export function MapSearch({
  open,
  filtersOpen,
  entryRequestId,
  search,
  onChange,
  onClose,
  types,
  selectedIds,
  hasProposals,
  count,
  reasons,
  contextCount = 0,
  hiddenEnded = false,
  explored = false,
  onReturnToHits,
}: {
  open: boolean;
  filtersOpen: boolean;
  entryRequestId: number;
  search: ObjectSearchState;
  onChange: (next: ObjectSearchState) => void;
  onClose: () => void;
  types: ObjectType[];
  selectedIds: string[];
  hasProposals: boolean;
  count: number;
  contextCount?: number;
  hiddenEnded?: boolean;
  explored?: boolean;
  onReturnToHits?: () => void;
  reasons: { id: string; name: string; fields: string[] }[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const previousEntryRequestId = useRef(entryRequestId);
  const [expanded, setExpanded] = useState(filtersOpen);
  const notice = useDraftFilterReset(hasProposals, search, onChange);
  useEffect(() => {
    if (open && (!wasOpen.current || entryRequestId !== previousEntryRequestId.current)) {
      input.current?.focus();
      setExpanded(filtersOpen);
    }
    wasOpen.current = open;
    previousEntryRequestId.current = entryRequestId;
  }, [open, filtersOpen, entryRequestId]);
  const context = (
    <div className="map-search-context">
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
    </div>
  );
  return (
    <>
      <section
        hidden={!open}
        className="map-object-search"
        aria-label="Kartans sökning och filter"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <header>
          <h2>Sök i kartan</h2>
          <button type="button" onClick={onClose}>
            Stäng
          </button>
        </header>
        <ObjectSearchInput
          search={search}
          onChange={onChange}
          inputRef={input}
          label="Sök objekt i kartan"
        />
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          Filter
        </button>
        <div hidden={!expanded}>
          <ObjectSearchFilters
            search={search}
            onChange={onChange}
            types={types}
            selectedIds={selectedIds}
            hasProposals={hasProposals}
          />
        </div>
        <p>{count} sökträffar</p>
        {context}
        {notice && <p>{notice}</p>}
        {!count && (
          <div>
            <h3>Inga objekt matchar</h3>
            <p>Ändra sökningen eller återställ sökning och filter.</p>
            <button type="button" onClick={() => onChange(initialObjectSearch)}>
              Återställ sökning och filter
            </button>
          </div>
        )}
        {reasons.length > 0 && (
          <ul aria-label="Matchande detaljfält">
            {reasons.map(({ id, name, fields }) => (
              <li key={id}>
                {name}: träff i {fields.join(', ')}
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="map-search-summary" aria-label="Kartans sökresultat" hidden={open}>
        <p>
          {[
            search.query && `Sökning: ${search.query}`,
            ...search.types.map(
              (id) => types.find((type) => type.id === id)?.name ?? 'Borttagen typ',
            ),
            search.onlySelected && 'Bara markerade',
            search.includeEnded && 'Ta med upphörda',
            ...(search.proposals ?? []),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p>{count} sökträffar</p>
        {context}
        {notice && <p>{notice}</p>}
        {!count && (
          <div>
            <p>Inga objekt matchar. Ändra sökningen eller återställ sökning och filter.</p>
            <button type="button" onClick={() => onChange(initialObjectSearch)}>
              Återställ sökning och filter
            </button>
          </div>
        )}
      </aside>
      <span className="map-search-status">
        <SearchResultStatus count={count} notice={notice} />
      </span>
    </>
  );
}
