// Kastbart listprov: kompakt lista, typkatalog och sök med förhandsvisning i samma fria panel.
import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import type { StudyObject, StudyRelationship } from './map-study-types.js';
import { ProfileStudyGlyph } from './ProfileStudyGlyph.js';
import './list-study-list.css';

export type ListStudyVariant = 'A' | 'B' | 'C';
export type ListStudyBrowseState = {
  query: string;
  types: string[];
  sort: 'name' | 'type';
  page: number;
  onlySelected: boolean;
  selectedResult: string | null;
  filtersOpen: boolean;
};

export const initialListStudyBrowseState: ListStudyBrowseState = {
  query: '',
  types: [],
  sort: 'name',
  page: 0,
  onlySelected: false,
  selectedResult: null,
  filtersOpen: false,
};
export default initialListStudyBrowseState;

type ListStudyListProps = {
  variant: ListStudyVariant;
  objects: StudyObject[];
  relationships: StudyRelationship[];
  names: Record<string, string>;
  staged: Record<string, string>;
  stagedLabel?: string;
  selectedIds: string[];
  state: ListStudyBrowseState;
  onState: (next: ListStudyBrowseState) => void;
  onMark: (id: string) => void;
  onClearSelection: () => void;
  onReveal: (id: string) => void;
  onDetails: (id: string) => void;
  noGraphics: boolean;
  memory?: { scrollTop: number; focusId: string | null };
};

const pageSize = 20;
const proposalLabels = {
  added: '＋ Föreslaget nytt',
  changed: '✎ Ändringsförslag',
  removed: '− Föreslaget borttaget',
};

export function ListStudyList({
  variant,
  objects,
  relationships,
  names,
  staged,
  stagedLabel = '✎ Namnförslag',
  selectedIds,
  state,
  onState,
  onMark,
  onClearSelection,
  onReveal,
  onDetails,
  noGraphics,
  memory,
}: ListStudyListProps) {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const originPickRef = useRef<string | null>(state.selectedResult);
  const nameOf = (object: StudyObject) => staged[object.id] ?? names[object.id] ?? object.name;
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const selected = new Set(selectedIds);
  const query = state.query.trim().toLocaleLowerCase('sv');
  const matching = objects.filter(
    (object) =>
      (!state.onlySelected || selected.has(object.id)) &&
      [nameOf(object), object.type, object.description].some((value) =>
        value.toLocaleLowerCase('sv').includes(query),
      ),
  );
  const types = [...new Set(objects.map((object) => object.type))].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  );
  const filtered = matching
    .filter((object) => !state.types.length || state.types.includes(object.type))
    .sort((a, b) => {
      const byName = nameOf(a).localeCompare(nameOf(b), 'sv', { numeric: true });
      return state.sort === 'type' ? a.type.localeCompare(b.type, 'sv') || byName : byName;
    });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(0, state.page), pages - 1);
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const preview = state.selectedResult ? objectById.get(state.selectedResult) : undefined;
  const directRelationships = preview
    ? relationships.filter((edge) => edge.from === preview.id || edge.to === preview.id)
    : [];

  useEffect(() => {
    if (state.page !== page) onState({ ...state, page });
  }, [page, state, onState]);

  useLayoutEffect(() => {
    const body = listRef.current?.closest<HTMLElement>('.np-panel-body');
    if (!memory || !body) return;
    body.scrollTop = memory.scrollTop;
    const remember = () => {
      memory.scrollTop = body.scrollTop;
    };
    body.addEventListener('scroll', remember, { passive: true });
    return () => {
      remember();
      body.removeEventListener('scroll', remember);
    };
  }, [memory]);

  function filter(next: Partial<ListStudyBrowseState>) {
    onState({ ...state, ...next, page: 0 });
  }

  function changePage(next: number) {
    onState({ ...state, page: next });
    showResults();
  }

  function showResults() {
    requestAnimationFrame(() => {
      resultsRef.current?.focus({ preventScroll: true });
      resultsRef.current?.scrollIntoView({ block: 'start' });
    });
  }

  function toggleType(type: string) {
    filter({
      types: state.types.includes(type)
        ? state.types.filter((value) => value !== type)
        : [...state.types, type],
    });
  }

  function inspect(objectId: string, fromResult = false) {
    if (fromResult) originPickRef.current = objectId;
    onState({ ...state, selectedResult: objectId });
    requestAnimationFrame(() => {
      previewRef.current?.focus();
      previewRef.current?.scrollIntoView({ block: 'nearest' });
    });
  }

  function closePreview() {
    onState({ ...state, selectedResult: null });
    requestAnimationFrame(() => {
      const origin = Array.from(
        resultsRef.current?.querySelectorAll<HTMLButtonElement>('[data-list-pick]') ?? [],
      ).find((button) => button.dataset.listPick === originPickRef.current);
      const target = origin ?? resultsRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'nearest' });
    });
  }

  function details(objectId: string) {
    if (memory) memory.focusId = objectId;
    onDetails(objectId);
  }

  function statuses(object: StudyObject) {
    return (
      <>
        {object.ended && <span className="ls-object-status">◷ Upphört</span>}
        {object.change && (
          <span className="ls-object-status ls-proposal">{proposalLabels[object.change]}</span>
        )}
        {staged[object.id] !== undefined && (
          <span className="ls-object-status ls-proposal">{stagedLabel}</span>
        )}
      </>
    );
  }

  function mark(object: StudyObject) {
    return (
      <label className="ls-mark" title={`Markera ${nameOf(object)}`}>
        <input
          type="checkbox"
          checked={selected.has(object.id)}
          onChange={() => onMark(object.id)}
          aria-label={`Markera ${nameOf(object)}`}
        />
      </label>
    );
  }

  function row(object: StudyObject) {
    return (
      <li key={object.id} className="ls-row" data-marked={selected.has(object.id)}>
        {mark(object)}
        <button
          type="button"
          className="ls-object-name"
          onClick={() => onReveal(object.id)}
          disabled={noGraphics}
          aria-label={`Visa ${nameOf(object)} i kartan`}
          title={noGraphics ? 'Kartan är avstängd' : `Visa ${nameOf(object)} i kartan`}
        >
          <strong className="ls-name-with-image">
            {object.profileImageUrl && (
              <span className="ls-profile-image" aria-hidden="true">
                <ProfileStudyGlyph object={object} />
              </span>
            )}
            {nameOf(object)}
          </strong>
          <span className="ls-row-meta">
            {object.type} {statuses(object)}
          </span>
        </button>
        <button
          type="button"
          className="ls-details-button"
          onClick={() => details(object.id)}
          data-list-object={object.id}
          aria-label={`Öppna uppgifter för ${nameOf(object)}`}
        >
          Uppgifter
        </button>
      </li>
    );
  }

  return (
    <div className={`ls-list ls-list-${variant}`} ref={listRef}>
      <label className="ls-search" htmlFor={`${id}-search`}>
        Sök objekt
        <input
          id={`${id}-search`}
          type="search"
          value={state.query}
          placeholder="Namn, typ eller beskrivning"
          onChange={(event) => filter({ query: event.target.value })}
        />
      </label>

      <details
        className="ls-filter-disclosure"
        open={state.filtersOpen}
        onToggle={(event) => {
          const filtersOpen = event.currentTarget.open;
          if (filtersOpen !== state.filtersOpen) onState({ ...state, filtersOpen });
        }}
      >
        <summary>
          {variant === 'B' ? 'Filter' : 'Filter och sortering'}
          {state.types.length > 0 &&
            ` · ${state.types.length > 2 ? `${state.types.length} typer` : state.types.join(', ')}`}
          {state.onlySelected && ' · Bara markerade'}
          {variant !== 'B' && state.sort === 'type' && ' · Typordning'}
          {variant !== 'B' &&
            !state.onlySelected &&
            selectedIds.length > 0 &&
            ` · ${selectedIds.length} ${selectedIds.length === 1 ? 'markerat' : 'markerade'}`}
        </summary>
        <div className="ls-filter-content">
          <fieldset className="ls-type-filter">
            <legend>Objekttyper</legend>
            <p className="ls-hint">Välj en eller flera typer. Utan val visas alla typer.</p>
            <button type="button" className="ls-all-types" onClick={() => filter({ types: [] })}>
              Alla typer · {matching.length}
            </button>
            <div className={`ls-type-catalogue${variant === 'B' ? '' : ' ls-types-plain'}`}>
              {types.map((type) => (
                <label key={type} data-checked={state.types.includes(type)}>
                  <input
                    type="checkbox"
                    checked={state.types.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span>{type}</span>
                  <b>{matching.filter((object) => object.type === type).length}</b>
                </label>
              ))}
            </div>
          </fieldset>
          {variant !== 'B' && (
            <div className="ls-filter-fields">
              <label htmlFor={`${id}-sort`}>
                Sortera
                <select
                  id={`${id}-sort`}
                  value={state.sort}
                  onChange={(event) => filter({ sort: event.target.value as 'name' | 'type' })}
                >
                  <option value="name">Namn, A–Ö</option>
                  <option value="type">Typ, sedan namn</option>
                </select>
              </label>
            </div>
          )}
          <div className="ls-selection-filter">
            <label>
              <input
                type="checkbox"
                checked={state.onlySelected}
                onChange={(event) => filter({ onlySelected: event.target.checked })}
              />
              Bara markerade ({selectedIds.length})
            </label>
            {selectedIds.length > 0 && (
              <button type="button" onClick={onClearSelection}>
                Avmarkera alla
              </button>
            )}
          </div>
          {variant === 'B' && (
            <button
              type="button"
              className="ls-show-results"
              onClick={() => {
                onState({ ...state, filtersOpen: false });
                showResults();
              }}
            >
              Visa {filtered.length} objekt
            </button>
          )}
        </div>
      </details>

      {variant === 'B' && (
        <label className="ls-sort-control" htmlFor={`${id}-sort`}>
          Sortering
          <select
            id={`${id}-sort`}
            value={state.sort}
            onChange={(event) => filter({ sort: event.target.value as 'name' | 'type' })}
          >
            <option value="name">Namn, A–Ö</option>
            <option value="type">Typ, sedan namn</option>
          </select>
        </label>
      )}

      {variant === 'C' && preview && (
        <section
          className="ls-preview"
          ref={previewRef}
          tabIndex={-1}
          aria-label={preview ? `Förhandsvisning av ${nameOf(preview)}` : 'Förhandsvisning'}
        >
          {preview ? (
            <>
              <div className="ls-preview-heading">
                <div>
                  <span className="ls-kicker">Förhandsvisning · {preview.type}</span>
                  <h3>{nameOf(preview)}</h3>
                </div>
                <button type="button" aria-label="Stäng förhandsvisningen" onClick={closePreview}>
                  ×
                </button>
              </div>
              <button type="button" className="ls-back-results" onClick={showResults}>
                Till sökträffarna
              </button>
              <div className="ls-preview-status">{statuses(preview)}</div>
              {!filtered.some((object) => object.id === preview.id) && (
                <p className="ls-hint">Det här objektet ligger utanför de aktuella sökträffarna.</p>
              )}
              <p>{preview.description}</p>
              <div className="ls-preview-actions">
                <button
                  type="button"
                  data-list-object={preview.id}
                  onClick={() => details(preview.id)}
                >
                  Öppna uppgifter
                </button>
                <button
                  type="button"
                  disabled={noGraphics}
                  title={noGraphics ? 'Kartan är avstängd' : undefined}
                  onClick={() => onReveal(preview.id)}
                >
                  Visa i kartan
                </button>
                <label className="ls-preview-mark">
                  <input
                    type="checkbox"
                    checked={selected.has(preview.id)}
                    onChange={() => onMark(preview.id)}
                  />
                  Markerad
                </label>
              </div>
              <h4>Direkta samband ({directRelationships.length})</h4>
              {directRelationships.length ? (
                <ul className="ls-preview-relationships">
                  {directRelationships.map((edge) => {
                    const from = objectById.get(edge.from);
                    const to = objectById.get(edge.to);
                    const other = objectById.get(edge.from === preview.id ? edge.to : edge.from);
                    return (
                      <li key={edge.id}>
                        <span>
                          {from ? nameOf(from) : 'Okänt objekt'} <b>{edge.label}</b>{' '}
                          {to ? nameOf(to) : 'Okänt objekt'}
                        </span>
                        {edge.change && (
                          <span className="ls-proposal">{proposalLabels[edge.change]}</span>
                        )}
                        {other && (
                          <button type="button" onClick={() => inspect(other.id)}>
                            Läs om {nameOf(other)}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="ls-hint">Inga direkta samband i provunderlaget.</p>
              )}
            </>
          ) : (
            <p>Välj en träff nedan för att läsa beskrivning och samband här i listan.</p>
          )}
        </section>
      )}

      <div className="ls-result-summary" aria-live="polite" aria-atomic="true">
        <strong>
          {filtered.length} av {objects.length} objekt
        </strong>
        {filtered.length > pageSize && (
          <span>
            Visar {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)}
          </span>
        )}
      </div>
      <p className="ls-hint ls-browse-hint">
        {variant === 'C'
          ? 'Träffen öppnar förhandsvisningen. Kartan flyttas när du väljer Visa i kartan.'
          : noGraphics
            ? 'Kartan är avstängd. Läs och redigera via Uppgifter.'
            : 'Namnet visar objektet i kartan. Uppgifter öppnas i ett eget fönster.'}
      </p>
      <section className="ls-results" ref={resultsRef} tabIndex={-1} aria-label="Sökträffar">
        {visible.length === 0 ? (
          <div className="ls-empty">
            <h3>Inga objekt matchar</h3>
            <p>Prova ett annat sökord, välj alla typer eller visa även omarkerade objekt.</p>
            <button
              type="button"
              onClick={() => filter({ query: '', types: [], onlySelected: false })}
            >
              Rensa sökning och filter
            </button>
          </div>
        ) : variant === 'A' ? (
          <ul className="ls-compact-results">{visible.map(row)}</ul>
        ) : variant === 'B' ? (
          <div className="ls-grouped-results">
            {types
              .filter((type) => visible.some((object) => object.type === type))
              .map((type) => (
                <section key={type} className="ls-type-group" aria-label={type}>
                  <header>
                    <h3>{type}</h3>
                    <span>{filtered.filter((object) => object.type === type).length} träffar</span>
                  </header>
                  <ul>{visible.filter((object) => object.type === type).map(row)}</ul>
                </section>
              ))}
          </div>
        ) : (
          <ul className="ls-pick-results">
            {visible.map((object) => (
              <li key={object.id}>
                <button
                  type="button"
                  aria-pressed={state.selectedResult === object.id}
                  aria-label={`Förhandsvisa ${nameOf(object)}`}
                  data-list-pick={object.id}
                  onClick={() => inspect(object.id, true)}
                >
                  <span className="ls-pick-copy">
                    <strong>{nameOf(object)}</strong>
                    <span className="ls-row-meta">
                      {object.type} {selected.has(object.id) && <span>✓ Markerad</span>}{' '}
                      {statuses(object)}
                    </span>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {pages > 1 && (
        <nav className="ls-pagination" aria-label="Sidor med objekt">
          <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}>
            Föregående
          </button>
          <label htmlFor={`${id}-page`}>
            Sida
            <select
              id={`${id}-page`}
              value={page}
              onChange={(event) => changePage(Number(event.target.value))}
            >
              {Array.from({ length: pages }, (_, index) => index).map((pageNumber) => (
                <option key={pageNumber} value={pageNumber}>
                  {pageNumber + 1} av {pages}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={page === pages - 1} onClick={() => changePage(page + 1)}>
            Nästa
          </button>
        </nav>
      )}
    </div>
  );
}
