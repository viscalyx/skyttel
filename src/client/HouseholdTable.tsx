import { Fragment, type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';
import { hasEnded } from '../shared/lifecycle.js';
import type { MapObject, MapState, ObjectType } from '../shared/map.js';
import { ObjectReadDetails } from './ObjectReadDetails.js';
import {
  initialObjectSearch,
  ObjectSearchFilters,
  ObjectSearchInput,
  objectSearchMatch,
  objectSearchResults,
  SearchResultStatus,
  searchRestricted,
  useDraftFilterReset,
} from './ObjectSearch.js';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './household-table.css';

export type HouseholdTableRow = {
  object: MapObject;
  type?: ObjectType;
  before?: MapObject | null;
  beforeType?: ObjectType;
  removed: boolean;
  proposal?: 'Nytt' | 'Ändrat' | 'Föreslagen borttagning';
};

function usable(element: HTMLElement | null): element is HTMLElement {
  return Boolean(
    element?.isConnected &&
      element.getClientRects().length &&
      !element.closest('[hidden], [inert]') &&
      !element.matches(':disabled'),
  );
}

/** Includes saved deletions for table filters, without adding them to the map. */
export function householdTableRows(state: MapState, types: ObjectType[]): HouseholdTableRow[] {
  const rows = new Map<string, HouseholdTableRow>();
  for (const { object, type } of state.removedObjects ?? [])
    rows.set(object.id, { object, type, removed: true });
  for (const object of state.objects)
    rows.set(object.id, {
      object,
      type: types.find((type) => type.id === object.typeId),
      removed: false,
    });
  for (const change of state.draft.changes) {
    const value = change.after ?? change.before;
    if (!value) continue;
    rows.set(change.id, {
      object: {
        ...value,
        id: change.id,
        householdId: change.type.householdId,
        revision: change.before?.revision ?? 0,
      },
      type: change.type,
      before: change.before,
      beforeType: change.beforeType ?? change.type,
      removed: rows.get(change.id)?.removed ?? false,
      proposal: !change.after ? 'Föreslagen borttagning' : change.before ? 'Ändrat' : 'Nytt',
    });
  }
  return [...rows.values()];
}

export function HouseholdTable({
  active,
  workDisabled = false,
  mapAvailable = true,
  rows,
  selectedIds,
  onSelect,
  onNew,
  onEdit,
  onRelationships,
  relationshipCounts,
  onRead,
  onReveal,
  onActions,
  searchContent,
  hasProposals = false,
  objectTypes = [],
  statusContent,
}: {
  active: boolean;
  workDisabled?: boolean;
  mapAvailable?: boolean;
  rows: HouseholdTableRow[];
  selectedIds: string[];
  onSelect: (object: MapObject) => void;
  onNew?: () => void;
  onEdit?: (object: MapObject) => void;
  onRelationships?: (object: MapObject, restoreFocus: () => void) => void;
  relationshipCounts?: Map<string, number>;
  onRead?: (object: MapObject, restoreFocus: () => void) => void;
  onReveal?: (object: MapObject) => void;
  onActions?: (object: MapObject, restoreFocus: () => void) => void;
  searchContent?: ReactNode;
  hasProposals?: boolean;
  objectTypes?: ObjectType[];
  statusContent?: ReactNode;
}) {
  const prefix = useId();
  const [sort, setSort] = useState('name-asc');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [search, setSearch] = useState(initialObjectSearch);
  const notice = useDraftFilterReset(hasProposals, search, setSearch);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const tableRegion = useRef<HTMLElement>(null);
  const resultRegion = useRef<HTMLElement>(null);
  const pageFocusRequested = useRef(false);
  const root = useRef<HTMLElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const scroll = useRef({ top: 0, left: 0 });
  const outerScroll = useRef(0);
  const lastRowFocus = useRef<{ id: string; action: string; order: string[] } | null>(null);
  const visited = useRef(false);
  const wasActive = useRef(false);
  const found = objectSearchResults(rows, search, selectedIds);
  const types = [
    ...new Map([
      ...objectTypes.map((type) => [type.id, type] as const),
      ...rows.flatMap((row) => (row.type ? [[row.type.id, row.type] as const] : [])),
    ]).values(),
  ];
  const descending = sort.endsWith('desc');
  const collator = new Intl.Collator('sv', { numeric: true });
  found.sort((a, b) => {
    const order = sort.startsWith('type')
      ? collator.compare(a.type?.name ?? '', b.type?.name ?? '')
      : 0;
    return (
      (order ||
        collator.compare(a.object.name, b.object.name) ||
        collator.compare(a.object.id, b.object.id)) * (descending ? -1 : 1)
    );
  });
  const pages = Math.max(1, Math.ceil(found.length / 50));
  const actualPage = Math.min(page, pages - 1);
  const visible = found.slice(actualPage * 50, (actualPage + 1) * 50);
  function replacementFocus(previous: { id: string; action: string; order: string[] } | null) {
    const index = previous?.order.indexOf(previous.id) ?? -1;
    if (previous && index >= 0) {
      const controls = [
        ...(root.current?.querySelectorAll<HTMLElement>('[data-table-action]') ?? []),
      ];
      const next = [
        ...previous.order.slice(index + 1),
        ...previous.order.slice(0, index).reverse(),
      ];
      for (const id of next) {
        const control = controls.find(
          (control) =>
            control.dataset.tableObject === id && control.dataset.tableAction === previous.action,
        );
        if (usable(control ?? null)) return control;
      }
    }
    return heading.current;
  }
  function captureReturnFocus(opener: HTMLButtonElement) {
    const previous = {
      id: opener.dataset.tableObject ?? '',
      action: opener.dataset.tableAction ?? '',
      order: found.map((row) => row.object.id),
    };
    return () => {
      const target = usable(opener) ? opener : replacementFocus(previous);
      target?.focus({ preventScroll: true });
    };
  }
  useLayoutEffect(() => {
    if (page !== actualPage) setPage(actualPage);
    if (active && pageFocusRequested.current) {
      pageFocusRequested.current = false;
      resultRegion.current?.focus({ preventScroll: true });
      resultRegion.current?.scrollIntoView({ block: 'start' });
    }
    if (active && !wasActive.current) {
      const target =
        visited.current && usable(lastFocus.current)
          ? lastFocus.current
          : visited.current
            ? replacementFocus(lastRowFocus.current)
            : heading.current;
      target?.focus({ preventScroll: true });
      if (tableRegion.current) {
        tableRegion.current.scrollTop = scroll.current.top;
        tableRegion.current.scrollLeft = scroll.current.left;
      }
      if (root.current) root.current.scrollTop = outerScroll.current;
      visited.current = true;
    } else if (
      active &&
      lastFocus.current &&
      !usable(lastFocus.current) &&
      document.activeElement === document.body
    ) {
      replacementFocus(lastRowFocus.current)?.focus({ preventScroll: true });
    }
    wasActive.current = active;
  });
  useLayoutEffect(() => {
    const dialog = filterDialog.current;
    if (filtersOpen && dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('h2')?.focus();
    } else if (!filtersOpen && dialog?.open) dialog.close();
  }, [filtersOpen]);
  function changePage(next: number) {
    pageFocusRequested.current = true;
    setPage(next);
    scroll.current.top = 0;
    if (tableRegion.current) tableRegion.current.scrollTop = 0;
  }
  return (
    <section
      ref={root}
      className="household-table"
      hidden={!active}
      aria-label="Hushållets tabell"
      onScroll={(event) => {
        if (active) outerScroll.current = event.currentTarget.scrollTop;
      }}
      onFocusCapture={(event) => {
        if (!event.target.closest('dialog')) {
          lastFocus.current = event.target;
          if (event.target.dataset.tableObject && event.target.dataset.tableAction)
            lastRowFocus.current = {
              id: event.target.dataset.tableObject,
              action: event.target.dataset.tableAction,
              order: found.map((row) => row.object.id),
            };
          else lastRowFocus.current = null;
        }
      }}
    >
      <header className="household-table-heading">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Hushållets tabell
          </h1>
          <span>Sparade uppgifter och ditt utkast</span>
        </div>
        {onNew && (
          <button type="button" className="primary" disabled={workDisabled} onClick={onNew}>
            ＋ Nytt objekt
          </button>
        )}
      </header>
      {statusContent}
      {!mapAvailable && (
        <p>
          Kartans grafik är inte tillgänglig. Du kan läsa och arbeta med alla uppgifter här i
          tabellen.
        </p>
      )}
      <section className="household-table-search" aria-label="Tabellens sökning och filter">
        {searchContent}
        <ObjectSearchInput
          search={search}
          onChange={(next) => {
            setSearch(next);
            setPage(0);
          }}
          label="Sök objekt i tabellen"
        />
        <button
          ref={filterButton}
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          Filter{searchRestricted(search) ? ' · aktiva' : ''}
        </button>
      </section>
      <section
        ref={resultRegion}
        tabIndex={-1}
        className="household-table-results"
        aria-label="Objekt i läsläge"
      >
        <div className="household-table-result-heading">
          <SearchResultStatus count={found.length} active={active} notice={notice} />
          <label>
            Sortering
            <select
              aria-label="Sortering"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="name-asc">Namn A–Ö</option>
              <option value="name-desc">Namn Ö–A</option>
              <option value="type-asc">Typ A–Ö</option>
              <option value="type-desc">Typ Ö–A</option>
            </select>
          </label>
        </div>
        <section
          className="household-table-scroll"
          ref={tableRegion}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll C's wide table.
          tabIndex={0}
          aria-label="Rullbar objekttabell"
          onScroll={(event) => {
            if (active)
              scroll.current = {
                top: event.currentTarget.scrollTop,
                left: event.currentTarget.scrollLeft,
              };
          }}
        >
          <table>
            <caption className="visually-hidden">
              Hushållets objekt. Expandera en rad för alla uppgifter.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  aria-sort={
                    sort.startsWith('name') ? (descending ? 'descending' : 'ascending') : 'none'
                  }
                >
                  Namn
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sort.startsWith('type') ? (descending ? 'descending' : 'ascending') : 'none'
                  }
                >
                  Typ
                </th>
                <th scope="col">Beskrivning</th>
                <th scope="col">Status</th>
                <th scope="col">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const { object } = row;
                const opened = expanded.includes(object.id);
                const reasons = objectSearchMatch(
                  object,
                  row.type,
                  search.query,
                  row.before,
                  row.beforeType,
                ).reasons;
                return (
                  <Fragment key={object.id}>
                    <tr data-selected={selectedIds.includes(object.id)}>
                      <th scope="row">
                        <button
                          type="button"
                          className="household-table-row-toggle"
                          data-table-object={object.id}
                          data-table-action="expand"
                          aria-expanded={opened}
                          aria-controls={`${prefix}-details-${object.id}`}
                          onClick={() => {
                            onSelect(object);
                            setExpanded((old) =>
                              opened ? old.filter((id) => id !== object.id) : [...old, object.id],
                            );
                          }}
                        >
                          <span aria-hidden="true">{opened ? '▾' : '▸'}</span>
                          {object.name}
                        </button>
                        {selectedIds.includes(object.id) && (
                          <span className="household-table-selection">✓ Markerad</span>
                        )}
                        {reasons.length > 0 && (
                          <span className="object-search-reason">Träff i {reasons.join(', ')}</span>
                        )}
                      </th>
                      <td>{row.type?.name ?? 'Borttagen typ'}</td>
                      <td>
                        <span className="household-table-truncate">
                          {object.description || 'Ej uppgivet'}
                        </span>
                      </td>
                      <td>
                        <span>
                          {row.removed ? 'Borttaget' : hasEnded(object) ? 'Upphört' : 'Aktuellt'}
                        </span>
                        {row.proposal && (
                          <span className="household-table-badge" data-kind={row.proposal}>
                            ◇ {row.proposal}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="household-table-row-actions">
                          {onEdit && !row.removed && (
                            <button
                              type="button"
                              aria-label={`Redigera ${object.name}`}
                              title="Redigera"
                              disabled={workDisabled}
                              onClick={() => onEdit(object)}
                            >
                              <WorkspaceIcon name="detail" />
                            </button>
                          )}
                          {onRelationships && (
                            <button
                              type="button"
                              aria-label={`Samband för ${object.name}`}
                              title={`Samband för ${object.name}`}
                              data-table-object={object.id}
                              data-table-action="relationships"
                              aria-describedby={`${prefix}-relationship-count-${object.id}`}
                              onClick={(event) =>
                                onRelationships(object, captureReturnFocus(event.currentTarget))
                              }
                            >
                              <span aria-hidden="true">↔</span>
                              <span id={`${prefix}-relationship-count-${object.id}`}>
                                {relationshipCounts?.get(object.id) ?? 0} samband
                              </span>
                            </button>
                          )}
                          {onReveal && !row.removed && (
                            <button
                              type="button"
                              aria-label={`Visa ${object.name} i kartan`}
                              title="Visa i kartan"
                              disabled={!mapAvailable || workDisabled}
                              onClick={() => onReveal(object)}
                            >
                              <WorkspaceIcon name="focus" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr
                      id={`${prefix}-details-${object.id}`}
                      className="household-table-detail-row"
                      hidden={!opened}
                    >
                      <td colSpan={5}>
                        {opened && <ObjectReadDetails row={row} />}
                        {opened && onRead && (
                          <button
                            type="button"
                            data-table-object={object.id}
                            data-table-action="read"
                            onClick={(event) =>
                              onRead(object, captureReturnFocus(event.currentTarget))
                            }
                            aria-label={`Läs alla uppgifter för ${object.name}`}
                          >
                            Läs alla uppgifter
                          </button>
                        )}
                        {opened && !row.removed && onActions && (
                          <button
                            type="button"
                            data-table-object={object.id}
                            data-table-action="actions"
                            onClick={(event) =>
                              onActions(object, captureReturnFocus(event.currentTarget))
                            }
                          >
                            Åtgärder för {object.name}
                          </button>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!visible.length && (
            <div className="household-table-empty">
              <h2>Inga objekt matchar</h2>
              <p>Ändra sökningen eller återställ sökning och filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch(initialObjectSearch);
                }}
              >
                Återställ sökning och filter
              </button>
            </div>
          )}
        </section>
        <nav className="household-table-pages" aria-label="Tabellsidor">
          <button
            type="button"
            disabled={actualPage === 0}
            onClick={() => changePage(actualPage - 1)}
          >
            Föregående
          </button>
          <span role="status">
            Sida {actualPage + 1} av {pages} · 50 objekt per sida
          </span>
          <button
            type="button"
            disabled={actualPage === pages - 1}
            onClick={() => changePage(actualPage + 1)}
          >
            Nästa
          </button>
        </nav>
      </section>
      <dialog
        ref={filterDialog}
        className="household-table-filter-dialog"
        aria-labelledby={`${prefix}-filters-title`}
        onCancel={() => setFiltersOpen(false)}
        onClose={() => {
          setFiltersOpen(false);
          if (active) filterButton.current?.focus();
        }}
      >
        <header>
          <h2 id={`${prefix}-filters-title`} tabIndex={-1}>
            Filter i tabellen
          </h2>
          <button type="button" aria-label="Stäng filter" onClick={() => setFiltersOpen(false)}>
            ×
          </button>
        </header>
        <ObjectSearchFilters
          search={search}
          onChange={(next) => {
            setSearch(next);
            setPage(0);
          }}
          types={types}
          selectedIds={selectedIds}
          hasProposals={hasProposals}
          table
        />
      </dialog>
    </section>
  );
}
