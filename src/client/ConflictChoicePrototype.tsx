// THROWAWAY: Can users tell which values can be selected, including an unchanged description?
// Four variants on the existing /households/:id route: ?prototype=conflict-choices&variant=A|B|C|D.
// Uses the real comparison data, with all choices and confirmations held only in memory.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  type ConflictChoices,
  type ConflictProperty,
  type ConflictSide,
  conflictProperties,
  conflictPropertyLabel,
  conflictValueText,
  sameConflictValue,
} from '../shared/conflict-properties.js';
import { draftConflicts } from '../shared/draft-conflicts.js';
import type { MapState } from '../shared/map.js';
import { trapDialogTab } from './modal-focus.js';
import { PrototypeSwitcher } from './PrototypeSwitcher.js';
import './conflict-dialog.css';
import './conflict-choice-prototype.css';

const sides = ['saved', 'proposed'] as const;
const sideNames = { saved: 'Sparat i kartan nu', proposed: 'Ditt förslag' };
type StudyProps = {
  fields: ConflictProperty[];
  choices: ConflictChoices;
  choose: (key: string, side: ConflictSide) => void;
  text: (field: ConflictProperty, side: ConflictSide) => string;
};

function provenance(field: ConflictProperty, side: ConflictSide) {
  if (sameConflictValue(field.saved, field.proposed)) return '';
  return sameConflictValue(field[side], field.before)
    ? 'Oförändrat från tidigare'
    : side === 'saved'
      ? 'Ett nytt värde har sparats'
      : 'Ditt föreslagna värde';
}

function changeClass(field: ConflictProperty, side: ConflictSide) {
  if (
    !sameConflictValue(field.saved, field.before) &&
    !sameConflictValue(field.proposed, field.before) &&
    !sameConflictValue(field.saved, field.proposed)
  )
    return ' cp-overlap';
  return sameConflictValue(field[side], field.before) ? '' : ' cp-change';
}

export function VariantA({
  fields,
  choices,
  choose,
  text,
  circles = true,
}: StudyProps & { circles?: boolean }) {
  return (
    <>
      <p>Välj ett värde för varje egenskap. Du kan klicka på hela rutan.</p>
      <div className="cp-comparison prototype-columns">
        {sides.map((side) => (
          <section key={side} aria-label={sideNames[side]}>
            <h3>{sideNames[side]}</h3>
            {fields.map((field) => {
              if (sameConflictValue(field.saved, field.proposed))
                return (
                  <div className="prototype-static" key={field.key}>
                    <strong>{conflictPropertyLabel(field, side)}</strong>
                    <span>{text(field, side)}</span>
                    <small>Samma värde · inget val behövs</small>
                  </div>
                );
              const picked = choices[field.key] === side;
              return (
                <button
                  type="button"
                  key={field.key}
                  className={`cp-field-choice prototype-choice${changeClass(field, side)}`}
                  aria-label={`${conflictPropertyLabel(field, side)}: ${sideNames[side]} – ${text(field, side)}`}
                  aria-pressed={picked}
                  onClick={() => choose(field.key, side)}
                >
                  {circles && (
                    <span className="prototype-circle" aria-hidden="true">
                      {picked ? '●' : ''}
                    </span>
                  )}
                  <span className="prototype-choice-content">
                    <span className="cp-field-name">{conflictPropertyLabel(field, side)}</span>
                    <small>{provenance(field, side)}</small>
                    <span className="cp-field-value">{text(field, side)}</span>
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}

export function VariantD(props: StudyProps) {
  return <VariantA {...props} circles={false} />;
}

export function VariantB({ fields, choices, choose, text }: StudyProps) {
  const prefix = useId();
  return (
    <>
      <p>Jämför en egenskap i taget. Markera det värde du vill behålla.</p>
      <div className="prototype-pairs">
        {fields.map((field) =>
          sameConflictValue(field.saved, field.proposed) ? (
            <div className="prototype-common-row" key={field.key}>
              <strong>{field.label}</strong>
              <span>{text(field, 'saved')}</span>
              <small>Samma värde på båda sidor</small>
            </div>
          ) : (
            <fieldset className="prototype-pair" key={field.key}>
              <legend>{field.label}</legend>
              <div>
                {sides.map((side) => (
                  <label key={side} className={`prototype-radio-choice${changeClass(field, side)}`}>
                    <input
                      type="radio"
                      name={`${prefix}-${field.key}`}
                      checked={choices[field.key] === side}
                      onChange={() => choose(field.key, side)}
                      aria-label={`${field.label}: ${sideNames[side]} – ${text(field, side)}`}
                    />
                    <span>
                      <strong>{sideNames[side]}</strong>
                      <span>{text(field, side)}</span>
                      <small>{provenance(field, side)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ),
        )}
      </div>
    </>
  );
}

export function VariantC({ fields, choices, choose, text }: StudyProps) {
  const differing = fields.filter((field) => !sameConflictValue(field.saved, field.proposed));
  const [step, setStep] = useState(0);
  const field = differing[Math.min(step, differing.length - 1)];
  if (!field) return <p>Alla värden är lika. Inget val behövs.</p>;
  return (
    <>
      <nav className="prototype-steps" aria-label="Egenskaper att välja">
        {differing.map((field, index) => (
          <button
            type="button"
            key={field.key}
            aria-current={step === index ? 'step' : undefined}
            onClick={() => setStep(index)}
          >
            {choices[field.key] ? '✓ ' : `${index + 1}. `}
            {field.label}
          </button>
        ))}
      </nav>
      <section className="prototype-task">
        <small>
          Val {step + 1} av {differing.length}
        </small>
        <h3>Välj värde för {field.label.toLocaleLowerCase('sv')}</h3>
        <p>Välj en av de två knapparna. Du kan gå tillbaka och ändra ditt val.</p>
        <div className="prototype-task-options">
          {sides.map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={choices[field.key] === side}
              className={`prototype-task-choice${changeClass(field, side)}`}
              onClick={() => choose(field.key, side)}
            >
              <small>{sideNames[side]}</small>
              <strong>{text(field, side)}</strong>
              <small>{provenance(field, side)}</small>
              <span className="prototype-action-text">
                {choices[field.key] === side
                  ? '✓ Vald'
                  : `Välj ${side === 'saved' ? 'det sparade värdet' : 'ditt förslag'} →`}
              </span>
            </button>
          ))}
        </div>
        <div className="prototype-step-actions">
          <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Föregående egenskap
          </button>
          <button
            type="button"
            disabled={step >= differing.length - 1}
            onClick={() => setStep(step + 1)}
          >
            Nästa egenskap
          </button>
        </div>
      </section>
      <section className="prototype-common">
        <h3>Uppgifter som redan är lika</h3>
        {fields
          .filter((field) => sameConflictValue(field.saved, field.proposed))
          .map((field) => (
            <div className="prototype-common-row" key={field.key}>
              <strong>{field.label}</strong>
              <span>{text(field, 'saved')}</span>
              <small>Inget val behövs</small>
            </div>
          ))}
      </section>
    </>
  );
}

export default function ConflictChoicePrototype({
  state,
  theme: initialTheme,
}: {
  state: MapState;
  theme: 'light' | 'dark';
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(initialTheme);
  const [choices, setChoices] = useState<ConflictChoices>({});
  const [confirmed, setConfirmed] = useState(false);
  const [conflictIndex, setConflictIndex] = useState(0);
  const entries = draftConflicts(state)
    .filter((entry) => entry.kind === 'object')
    .filter((entry) => entry.current && conflictProperties(state, entry).length);
  const conflict = entries[conflictIndex] ?? entries[0];
  const fields = conflict ? conflictProperties(state, conflict) : [];
  const variantParam = new URLSearchParams(location.search).get('variant');
  const variant =
    variantParam === 'B' || variantParam === 'C' || variantParam === 'D' ? variantParam : 'A';
  const name =
    state.draft.changes.find((change) => change.id === conflict?.id)?.after?.name ?? 'Konflikt';
  const remaining = fields.filter(
    (field) => !sameConflictValue(field.saved, field.proposed) && !choices[field.key],
  ).length;
  const text = (field: ConflictProperty, side: ConflictSide) =>
    conflictValueText(state, field, field[side]) || 'Tomt värde';
  const choose = (key: string, side: ConflictSide) => {
    setChoices((current) => ({ ...current, [key]: side }));
    setConfirmed(false);
  };
  const props: StudyProps = { fields, choices, choose, text };
  const close = () => {
    const search = new URLSearchParams(location.search);
    search.delete('prototype');
    search.delete('variant');
    navigate({ pathname: location.pathname, search: search.toString() }, { replace: true });
  };

  useLayoutEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    element?.querySelector<HTMLElement>('h1')?.focus();
    return () => {
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  useEffect(() => {
    console.info('Conflict choice prototype', {
      variant,
      conflictId: conflict?.id,
      theme,
      choices,
      fields: fields.map((field) => ({
        key: field.key,
        saved: field.saved,
        proposed: field.proposed,
        before: field.before,
      })),
      confirmed,
    });
  }, [variant, conflict?.id, theme, choices, fields, confirmed]);

  return (
    <dialog
      ref={dialog}
      className="cp-dialog cp-product cp-choice-prototype"
      data-theme={theme}
      aria-labelledby={title}
      onKeyDown={trapDialogTab}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="cp-top">
        <div>
          <small>PROTOTYP · Valen sparas inte</small>
          <h1 id={title} tabIndex={-1}>
            Granska konflikter
          </h1>
          <p>Kan du se vilka värden som går att välja?</p>
        </div>
        <div className="prototype-header-actions">
          <button
            type="button"
            aria-label={`Byt till ${theme === 'light' ? 'mörkt' : 'ljust'} tema`}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '☾ Mörkt' : '☀ Ljust'}
          </button>
          <button type="button" aria-label="Stäng prototypen" onClick={close}>
            ✕
          </button>
        </div>
      </header>
      <div className="cp-body">
        <nav className="cp-case-list" aria-label="Konflikter att prova">
          {entries.map((entry, index) => (
            <button
              type="button"
              key={entry.id}
              aria-current={conflict === entry ? 'true' : undefined}
              onClick={() => {
                setConflictIndex(index);
                setChoices({});
                setConfirmed(false);
              }}
            >
              <span className="cp-case-text">
                <small>Objekt</small>
                <span>
                  {state.draft.changes.find((change) => change.id === entry.id)?.after?.name ??
                    entry.current?.name}
                </span>
              </span>
            </button>
          ))}
          <p className="prototype-study-note">
            Samma jämförelse i alla fyra varianter. Byt med pilarna längst ned.
          </p>
        </nav>
        <article className="cp-detail">
          <small>
            Objekt ·{' '}
            {variant === 'A'
              ? 'Två kolumner med valcirklar'
              : variant === 'B'
                ? 'Parvis jämförelse'
                : variant === 'C'
                  ? 'Ett val i taget'
                  : 'Två kolumner utan valcirklar'}
          </small>
          <h2>{name}</h2>
          {!conflict ? (
            <p>Öppna ett hushåll med en objektkonflikt, till exempel testdemodatan.</p>
          ) : (
            <>
              {variant === 'A' ? (
                <VariantA {...props} />
              ) : variant === 'B' ? (
                <VariantB {...props} />
              ) : variant === 'D' ? (
                <VariantD {...props} />
              ) : (
                <VariantC key={conflict.id} {...props} />
              )}
              <section className="cp-preview" aria-label="Resultat av prototypvalen">
                <h3>Efter dina val</h3>
                <p>
                  {remaining
                    ? `${remaining} egenskaper återstår att välja.`
                    : 'Alla egenskaper har ett valt värde.'}
                </p>
                <dl className="cp-fields">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>
                        {sameConflictValue(field.saved, field.proposed)
                          ? text(field, 'saved')
                          : choices[field.key]
                            ? text(field, choices[field.key])
                            : 'Välj ett värde'}
                        {!sameConflictValue(field.saved, field.proposed) && choices[field.key] && (
                          <small> · {sideNames[choices[field.key]]}</small>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <footer className="cp-actions prototype-footer">
                <button
                  type="button"
                  className="cp-primary"
                  disabled={remaining > 0}
                  onClick={() => setConfirmed(true)}
                >
                  Prova att lägga valen i utkastet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChoices({});
                    setConfirmed(false);
                  }}
                >
                  Börja om
                </button>
              </footer>
              <p role="status">
                {confirmed
                  ? 'Du har bekräftat valen i prototypen. Ditt riktiga utkast är oförändrat.'
                  : 'Prova gärna båda beskrivningarna, även den som är oförändrad från tidigare.'}
              </p>
            </>
          )}
        </article>
      </div>
      <PrototypeSwitcher current={variant} />
    </dialog>
  );
}
