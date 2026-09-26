// Kastbart ikonval i B:s detaljer. Alla val använder samma privata utkast.
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { IconStudyGlyph } from './IconStudyGlyph.js';
import { findIconStudyIcon, iconStudyCatalog } from './icon-study-catalog.js';
import type { IconStudyModel } from './icon-study-model.js';
import './icon-study-panel.css';

type IconStudyPanelProps = {
  objectId: string;
  name: string;
  model: IconStudyModel;
  creation: boolean;
  unsent: boolean;
  blocked: boolean;
  editing: boolean;
  hasImage: boolean;
  onStageText: () => void;
  onEdit: () => void;
  onChange: () => void;
};

const pageSize = 24;
function searchText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('sv');
}
const searchableIcons = iconStudyCatalog.map((icon) => ({
  icon,
  name: searchText(icon.label),
  id: searchText(icon.id),
  text: searchText([icon.id, icon.label, ...icon.keywords].join(' ')),
}));

function iconName(iconId: string | null | undefined) {
  return findIconStudyIcon(iconId)?.label ?? 'Typens standardikon';
}

function IconSymbol({ iconId }: { iconId: string | null | undefined }) {
  return iconId ? (
    <IconStudyGlyph iconId={iconId} className="isi-glyph" />
  ) : (
    <span className="isi-default-symbol" aria-hidden="true" />
  );
}

export function IconStudyPanel({
  objectId,
  name,
  model,
  creation,
  unsent,
  blocked,
  editing,
  hasImage,
  onStageText,
  onEdit,
  onChange,
}: IconStudyPanelProps) {
  const id = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLFieldSetElement>(null);
  const focusPicker = useRef(false);
  const [query, setQuery] = useState('');
  const [requestedPage, setRequestedPage] = useState(0);
  const value = model.current(objectId);
  const staged = Object.hasOwn(model.staged, objectId);
  const needsText = creation || unsent;
  const disabled = blocked || needsText;
  const normalizedQuery = searchText(query).trim();
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  function rank(icon: (typeof searchableIcons)[number]) {
    if (!normalizedQuery) return 2;
    if (icon.name === normalizedQuery || icon.id === normalizedQuery) return 0;
    return icon.name.startsWith(normalizedQuery) || icon.id.startsWith(normalizedQuery) ? 1 : 2;
  }
  const matches = searchableIcons
    .filter(({ text }) => terms.every((term) => text.includes(term)))
    .sort((left, right) => rank(left) - rank(right));
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(requestedPage, pageCount - 1);
  const visible = matches.slice(page * pageSize, (page + 1) * pageSize);

  useLayoutEffect(() => {
    if (!focusPicker.current || !editing || blocked) return;
    if (needsText) stageRef.current?.focus();
    else searchRef.current?.focus();
    focusPicker.current = false;
  }, [editing, needsText, blocked]);

  function pick(next: string | null) {
    if (disabled || next === value) return;
    model.pick(objectId, next);
    onChange();
  }

  function changePage(next: number) {
    setRequestedPage(next);
    requestAnimationFrame(() => resultsRef.current?.querySelector('button')?.focus());
  }

  function clearSearch() {
    setQuery('');
    setRequestedPage(0);
    searchRef.current?.focus();
  }

  return (
    <section className="isi-panel ds-section" aria-labelledby={`${id}-heading`}>
      <div className="isi-heading">
        <h3 id={`${id}-heading`}>Ikon</h3>
        <span>Valfritt</span>
      </div>
      <div className="isi-content">
        <div className="isi-selection">
          <div className="isi-selected-symbol">
            <IconSymbol iconId={value} />
          </div>
          <div className="isi-selected-name">
            <strong>{iconName(value)}</strong>
            <p role="status" aria-live="polite">
              {staged
                ? 'Ikonvalet finns i ditt privata utkast'
                : value
                  ? 'Delad ikon'
                  : 'Följer objektets typ'}
            </p>
          </div>
        </div>
        <p className="isi-help" id={`${id}-image-hint`}>
          {hasImage
            ? 'Profilbilden visas i kartan och listan. Ikonen finns kvar och visas när objektet saknar profilbild.'
            : 'Ikonen visas i kartan och listan. Om du lägger till en profilbild visas bilden i stället.'}
        </p>

        {editing ? (
          <>
            <p className="isi-help" id={`${id}-draft-hint`}>
              Alla ikoner kan användas för alla objekt. Ett ikonval blir direkt ett privat förslag.
              Spara hela utkastet för att dela det med hushållet.
            </p>
            {needsText && (
              <div className="isi-stage-text">
                <p id={`${id}-stage-hint`}>
                  {creation
                    ? 'Lägg först objektet i ditt utkast. Sedan kan du välja en ikon.'
                    : 'Lägg först dina oskickade uppgifter i utkastet. Sedan kan du ändra ikonen.'}
                </p>
                <button
                  type="button"
                  ref={stageRef}
                  disabled={blocked}
                  onClick={() => {
                    focusPicker.current = true;
                    onStageText();
                  }}
                >
                  Lägg uppgifterna i utkastet först
                </button>
              </div>
            )}
            <label className="isi-search" htmlFor={`${id}-query`}>
              Sök ikon
              <input
                id={`${id}-query`}
                ref={searchRef}
                type="search"
                value={query}
                placeholder="Till exempel cykel, musik eller bike"
                disabled={disabled}
                aria-controls={`${id}-results`}
                aria-describedby={needsText ? `${id}-stage-hint` : `${id}-search-hint`}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setRequestedPage(0);
                }}
              />
            </label>
            <p className="isi-help" id={`${id}-search-hint`}>
              Sök bland {iconStudyCatalog.length.toLocaleString('sv')} ikoner med engelska namn
              eller vanliga svenska sökord.
            </p>
            {query && (
              <button type="button" className="isi-clear" onClick={clearSearch} disabled={disabled}>
                Rensa sökningen
              </button>
            )}
            <div id={`${id}-results`}>
              {!needsText && (
                <>
                  <button
                    type="button"
                    className="isi-default-choice"
                    aria-pressed={value === null}
                    disabled={disabled}
                    onClick={() => pick(null)}
                  >
                    <IconSymbol iconId={null} />
                    <span>Typens standardikon</span>
                    {value === null && <span aria-hidden="true">✓</span>}
                  </button>
                  <p className="isi-result-count" role="status" aria-live="polite">
                    {matches.length
                      ? `${matches.length.toLocaleString('sv')} ${matches.length === 1 ? 'ikon' : 'ikoner'} · visar ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, matches.length)}`
                      : `Inga ikoner matchar ”${query}”. Prova ett annat sökord eller rensa sökningen.`}
                  </p>
                  <fieldset
                    className="isi-grid"
                    aria-label={`Välj ikon för ${name || 'objektet'}`}
                    ref={resultsRef}
                  >
                    {visible.map(({ icon }) => (
                      <button
                        type="button"
                        key={icon.id}
                        className="isi-choice"
                        aria-label={`Välj ${icon.label}`}
                        aria-pressed={value === icon.id}
                        disabled={disabled}
                        onClick={() => pick(icon.id)}
                      >
                        <IconStudyGlyph iconId={icon.id} className="isi-glyph" />
                        <span>{icon.label}</span>
                        {value === icon.id && (
                          <span className="isi-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </fieldset>
                  {pageCount > 1 && (
                    <nav className="isi-pages" aria-label="Bläddra bland ikoner">
                      <button
                        type="button"
                        onClick={() => changePage(page - 1)}
                        disabled={disabled || page === 0}
                      >
                        Föregående
                      </button>
                      <span>
                        Sida {page + 1} av {pageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => changePage(page + 1)}
                        disabled={disabled || page === pageCount - 1}
                      >
                        Nästa
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
            {blocked && <p className="isi-help">Ikonändringar är tillfälligt blockerade.</p>}
          </>
        ) : (
          <button
            type="button"
            className="ds-section-edit"
            disabled={blocked}
            onClick={() => {
              focusPicker.current = true;
              onEdit();
            }}
          >
            {value ? 'Ändra ikon' : 'Välj ikon'}
          </button>
        )}
      </div>
    </section>
  );
}

export function IconStudyDraft({
  model,
  objects,
}: {
  model: IconStudyModel;
  objects: { id: string; name: string }[];
}) {
  const entries = Object.entries(model.staged);
  if (!entries.length) return null;
  return (
    <section className="isi-draft" aria-label="Ikonförslag i utkastet">
      <h3>Ikoner</h3>
      {entries.map(([objectId, after]) => {
        const name = objects.find((object) => object.id === objectId)?.name ?? 'Objekt';
        const before = model.saved[objectId] ?? null;
        return (
          <article className="isi-draft-object" key={objectId}>
            <h4>{name}</h4>
            <div className="isi-comparison">
              {[
                { label: 'Gemensam karta', iconId: before },
                { label: 'Ditt utkast', iconId: after },
              ].map(({ label, iconId }) => (
                <div key={label}>
                  <h5>{label}</h5>
                  <IconSymbol iconId={iconId} />
                  <p>{iconName(iconId)}</p>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
