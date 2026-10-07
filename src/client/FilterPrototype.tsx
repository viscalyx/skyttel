// THROWAWAY: five structurally different map filter designs on the existing
// /households/:id route, switchable with ?variant=A–E. No persistence or API writes.
import { type ComponentProps, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  initialObjectSearch,
  type MapSearch,
  ObjectSearchInput,
  proposalLabels,
} from './ObjectSearch.js';
import { PrototypeSwitcher } from './PrototypeSwitcher.js';
import './filter-prototype.css';

const variants = [
  {
    key: 'A',
    name: 'Snabbval',
    description: 'Alla filter som kompakta knappar. Ett klick slår på eller av.',
  },
  {
    key: 'B',
    name: 'Fokuspanelen',
    description: 'En sidopanel med aktiva val först. Kartan finns kvar bredvid.',
  },
  {
    key: 'C',
    name: 'Filterpaletten',
    description: 'Sök efter ett filter. Använd ↑ ↓ och Enter, eller klicka.',
  },
  {
    key: 'D',
    name: 'Filterraden',
    description: 'Filtren ligger direkt under sökningen, nära det du ser på kartan.',
  },
  {
    key: 'E',
    name: 'Filterbyggaren',
    description: 'Lägg till från vänster och ta bort till höger. Se hela ditt urval.',
  },
];
type Option = { id: string; label: string; active: boolean; toggle: () => void };
type Group = { name: string; options: Option[] };
type ViewProps = {
  groups: Group[];
  active: Option[];
  reset: () => void;
  matchingCount?: number;
};
function Choice({ option, command = false }: { option: Option; command?: boolean }) {
  return (
    <button
      type="button"
      className={command ? 'prototype-command' : 'prototype-choice'}
      aria-pressed={option.active}
      onClick={option.toggle}
    >
      <span className="prototype-check" aria-hidden="true">
        {option.active ? '✓' : '+'}
      </span>
      <span>{option.label}</span>
      {command && <small>{option.active ? 'På' : 'Av'}</small>}
    </button>
  );
}
function ActiveChoices({ active }: { active: Option[] }) {
  const container = useRef<HTMLFieldSetElement>(null);
  function remove(option: Option, index: number) {
    const root = container.current?.closest('.filter-prototype');
    option.toggle();
    requestAnimationFrame(() => {
      const buttons = container.current?.querySelectorAll<HTMLButtonElement>('button');
      const next =
        buttons?.[Math.min(index, buttons.length - 1)] ??
        root?.querySelector<HTMLInputElement>('.prototype-builder-available input') ??
        root?.querySelector<HTMLButtonElement>('.map-search-filter > button');
      next?.focus();
    });
  }
  return (
    <fieldset ref={container} className="prototype-active" aria-label="Aktiva filter">
      {active.length ? (
        active.map((option, index) => (
          <button
            type="button"
            key={option.id}
            onClick={() => remove(option, index)}
            aria-label={`Ta bort filter: ${option.label}`}
          >
            {option.label}
            <span aria-hidden="true">×</span>
          </button>
        ))
      ) : (
        <span className="prototype-empty">Inga extra filter · alla typer</span>
      )}
    </fieldset>
  );
}
function Result({ matchingCount }: Pick<ViewProps, 'matchingCount'>) {
  return (
    <span role="status">
      {matchingCount ?? '–'} träffar
      <span className="prototype-result-note"> · uppdateras direkt</span>
    </span>
  );
}
function Footer({ reset, matchingCount }: ViewProps) {
  return (
    <footer className="prototype-footer">
      <Result matchingCount={matchingCount} />
      <button type="button" onClick={reset}>
        Återställ filter
      </button>
    </footer>
  );
}
function GroupChoices({ group }: { group: Group }) {
  return (
    <fieldset className="prototype-group">
      <legend>{group.name}</legend>
      <div className="prototype-choices">
        {group.options.map((option) => (
          <Choice key={option.id} option={option} />
        ))}
      </div>
    </fieldset>
  );
}

export function VariantA(props: ViewProps) {
  return (
    <div className="prototype-quick">
      <p className="prototype-hint">Välj flera typer. Utan val visas alla typer.</p>
      {props.groups.map((group) => (
        <GroupChoices key={group.name} group={group} />
      ))}
      <Footer {...props} />
    </div>
  );
}

export function VariantB(props: ViewProps) {
  const [query, setQuery] = useState('');
  return (
    <div className="prototype-sidebar">
      <div className="prototype-sidebar-overview">
        <strong>
          {props.matchingCount ?? '–'}
          <span> träffar i kartan</span>
        </strong>
        <ActiveChoices active={props.active} />
      </div>
      <label className="prototype-search-label">
        Hitta en objekttyp
        <input
          type="search"
          placeholder="Sök bland typer…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="prototype-sidebar-groups">
        {props.groups.map((group, index) => (
          <details key={group.name} open>
            <summary>
              {group.name}
              <small>{group.options.filter((option) => option.active).length} valda</small>
            </summary>
            <div
              className={`prototype-sidebar-options${index === 0 ? ' prototype-type-grid' : ''}`}
            >
              {group.options
                .filter(
                  (option) =>
                    index !== 0 ||
                    option.label.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')),
                )
                .map((option) => (
                  <Choice key={option.id} option={option} />
                ))}
            </div>
            {index === 0 &&
              !group.options.some((option) =>
                option.label.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')),
              ) && <p className="prototype-hint">Ingen typ matchar sökningen.</p>}
          </details>
        ))}
      </div>
      <Footer {...props} />
    </div>
  );
}

export function VariantC(props: ViewProps) {
  const [query, setQuery] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const visible = props.groups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        `${group.name} ${option.label}`
          .toLocaleLowerCase('sv')
          .includes(query.toLocaleLowerCase('sv')),
      ),
    }))
    .filter((group) => group.options.length);
  function navigate(event: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const buttons = [
      ...(list.current?.querySelectorAll<HTMLButtonElement>('.prototype-command') ?? []),
    ];
    if (!buttons.length) return;
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      index < 0
        ? event.key === 'ArrowDown'
          ? 0
          : buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
  }
  return (
    <section className="prototype-palette" aria-label="Sök och välj filter" onKeyDown={navigate}>
      <label className="prototype-search-label">
        <span className="visually-hidden">Sök bland alla filter</span>
        <input
          type="search"
          placeholder="Sök typ, status eller utkast…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <ActiveChoices active={props.active} />
      <div ref={list} className="prototype-command-list">
        {visible.map((group) => (
          <section key={group.name} aria-label={group.name}>
            <h3>{group.name}</h3>
            {group.options.map((option) => (
              <Choice key={option.id} option={option} command />
            ))}
          </section>
        ))}
        {!visible.length && (
          <p className="prototype-hint">Inget filter matchar. Prova ett annat ord.</p>
        )}
      </div>
      <Footer {...props} />
    </section>
  );
}

export function VariantD(props: ViewProps) {
  return (
    <div className="prototype-strip">
      <div className="prototype-strip-tools">
        <details className="prototype-type-menu">
          <summary>
            Objekttyper{' '}
            <strong>
              {props.groups[0].options.filter((option) => option.active).length || 'Alla'}
            </strong>
            <span aria-hidden="true">⌄</span>
          </summary>
          <GroupChoices group={props.groups[0]} />
          <p className="prototype-hint">Utan val visas alla typer.</p>
        </details>
        {props.groups.slice(1).map((group) => (
          <GroupChoices key={group.name} group={group} />
        ))}
      </div>
      <div className="prototype-strip-bottom">
        <ActiveChoices active={props.active} />
        <Footer {...props} />
      </div>
    </div>
  );
}

export function VariantE(props: ViewProps) {
  const [groupIndex, setGroupIndex] = useState(0);
  const [query, setQuery] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const group = props.groups[Math.min(groupIndex, props.groups.length - 1)];
  const available = group.options.filter(
    (option) =>
      !option.active &&
      option.label.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')),
  );
  return (
    <div className="prototype-builder">
      <div className="prototype-builder-columns">
        <section className="prototype-builder-available" aria-label="Tillgängliga filter">
          <h3>Lägg till</h3>
          <fieldset className="prototype-group-tabs" aria-label="Filtergrupp">
            {props.groups.map((item, index) => (
              <button
                type="button"
                key={item.name}
                aria-pressed={index === groupIndex}
                onClick={() => setGroupIndex(index)}
              >
                {index === 0 ? 'Typer' : index === 1 ? 'Status' : 'Utkast'}
              </button>
            ))}
          </fieldset>
          <label className="prototype-search-label">
            <span className="visually-hidden">Sök tillgängliga filter</span>
            <input
              ref={input}
              type="search"
              placeholder="Hitta ett filter…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div ref={list} className="prototype-builder-list">
            {available.map((option, index) => (
              <Choice
                key={option.id}
                option={{
                  ...option,
                  toggle: () => {
                    option.toggle();
                    requestAnimationFrame(() => {
                      const buttons = list.current?.querySelectorAll<HTMLButtonElement>('button');
                      (buttons?.[Math.min(index, buttons.length - 1)] ?? input.current)?.focus();
                    });
                  },
                }}
                command
              />
            ))}
            {!available.length && (
              <p className="prototype-hint">Inga fler matchande filter i gruppen.</p>
            )}
          </div>
        </section>
        <section className="prototype-builder-selection" aria-label="Ditt urval">
          <h3>
            Ditt urval <span>{props.active.length}</span>
          </h3>
          {props.groups.map((item, index) => (
            <section key={item.name} className="prototype-selection-group">
              <h4>{item.name}</h4>
              {item.options.some((option) => option.active) ? (
                <ActiveChoices active={item.options.filter((option) => option.active)} />
              ) : (
                <p className="prototype-hint">
                  {index === 0
                    ? 'Alla objekttyper visas.'
                    : index === 1
                      ? 'Upphörda visas inte. Även omarkerade visas.'
                      : 'Ingen begränsning till utkast.'}
                </p>
              )}
            </section>
          ))}
        </section>
      </div>
      <Footer {...props} />
    </div>
  );
}

export default function FilterPrototype({
  search,
  onChange,
  types,
  selectedIds,
  hasProposals,
  active,
  entryRequestId,
  onReturnToMap,
  matchingCount,
}: ComponentProps<typeof MapSearch>) {
  const [params] = useSearchParams();
  const variant = variants.find((item) => item.key === params.get('variant')) ?? variants[0];
  const [expanded, setExpanded] = useState(true);
  const section = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const lastEntry = useRef(entryRequestId);
  const id = useId();
  function close() {
    setExpanded(false);
    filterButton.current?.focus();
  }
  useEffect(() => {
    if (expanded && active) title.current?.focus();
  }, [expanded, active]);
  useEffect(() => {
    if (!active) setExpanded(false);
    if (active && entryRequestId !== lastEntry.current) {
      setExpanded(false);
      input.current?.focus();
    }
    lastEntry.current = entryRequestId;
  }, [active, entryRequestId]);
  useEffect(() => {
    if (!expanded || !active || !['A', 'C'].includes(variant.key)) return;
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !section.current?.contains(event.target) &&
        !event.target.closest('.prototype-switcher')
      ) {
        setExpanded(false);
        // Preserve focus on other controls when the user clicks them.
        if (!event.target.closest('button, input, a, select, textarea, [tabindex]'))
          filterButton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [expanded, active, variant.key]);
  const groups: Group[] = [
    {
      name: 'Objekttyp',
      options: [...types]
        .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
        .map((type) => ({
          id: type.id,
          label: type.name,
          active: search.types.includes(type.id),
          toggle: () =>
            onChange({
              ...search,
              types: search.types.includes(type.id)
                ? search.types.filter((value) => value !== type.id)
                : [...search.types, type.id],
            }),
        })),
    },
    {
      name: 'Status',
      options: [
        {
          id: 'ended',
          label: 'Ta med upphörda',
          active: Boolean(search.includeEnded),
          toggle: () => onChange({ ...search, includeEnded: !search.includeEnded }),
        },
        {
          id: 'selected',
          label: `Bara markerade (${selectedIds.length})`,
          active: search.onlySelected,
          toggle: () => onChange({ ...search, onlySelected: !search.onlySelected }),
        },
      ],
    },
    ...(hasProposals
      ? [
          {
            name: 'Förslag i ditt utkast',
            options: proposalLabels.map((label) => ({
              id: `draft-${label}`,
              label,
              active: Boolean(search.proposals?.includes(label)),
              toggle: () =>
                onChange({
                  ...search,
                  proposals: search.proposals?.includes(label)
                    ? search.proposals.filter((value) => value !== label)
                    : [...(search.proposals ?? []), label],
                }),
            })),
          },
        ]
      : []),
  ];
  const selected = groups.flatMap((group) => group.options).filter((option) => option.active);
  const props: ViewProps = {
    groups,
    active: selected,
    matchingCount,
    reset: () => onChange({ ...initialObjectSearch, query: search.query }),
  };
  const Variant = { A: VariantA, B: VariantB, C: VariantC, D: VariantD, E: VariantE }[
    variant.key as 'A' | 'B' | 'C' | 'D' | 'E'
  ];
  return (
    <>
      <section
        ref={section}
        className={`map-object-search filter-prototype prototype-${variant.key}`}
        aria-label="Kartans sökning och filter"
        data-expanded={expanded}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            if (expanded) close();
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
            aria-label={`Filter${selected.length ? ` · ${selected.length} aktiva` : ''}`}
            aria-expanded={expanded}
            aria-controls={id}
            aria-haspopup="dialog"
            onClick={() => (expanded ? close() : setExpanded(true))}
          >
            <span aria-hidden="true">≡</span> Filter
            {selected.length > 0 && (
              <span className="prototype-filter-count">{selected.length}</span>
            )}
          </button>
        </div>
        {expanded ? (
          <div id={id} className="prototype-panel" role="dialog" aria-labelledby={`${id}-title`}>
            <header className="prototype-panel-header">
              <div>
                <small>{variant.key === 'D' ? 'FILTER DIREKT I KARTAN' : 'KARTANS FILTER'}</small>
                <h2 ref={title} id={`${id}-title`} tabIndex={-1}>
                  {variant.name}
                </h2>
              </div>
              <button type="button" onClick={close} aria-label="Stäng filter">
                ×
              </button>
            </header>
            <Variant {...props} />
          </div>
        ) : (
          selected.length > 0 && (
            <div className="prototype-closed-summary">
              <ActiveChoices active={selected} />
            </div>
          )
        )}
      </section>
      {active && (
        <PrototypeSwitcher
          variants={variants}
          current={variant.key}
          onSwitch={() => setExpanded(true)}
          state={{
            variant: variant.key,
            filters: search,
            selectedIds,
            hasProposals,
            matchingCount,
            objectTypes: types.map((type) => ({ id: type.id, name: type.name })),
          }}
        />
      )}
    </>
  );
}
