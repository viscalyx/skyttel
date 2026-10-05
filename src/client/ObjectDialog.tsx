import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { sameConflictValue } from '../shared/conflict-properties.js';
import { financialFields } from '../shared/financial-facts.js';
import {
  type MapDraft,
  type MapState,
  type ObjectType,
  type ObjectValue,
  objectTypePresentation,
} from '../shared/map.js';
import { type ObjectProperty, objectProperties } from '../shared/object-properties.js';
import { FinancialFactEditor } from './FinancialFacts.js';
import { type FormLeaveGuard, useFormLeave } from './FormLeave.js';
import { LifecycleEditor } from './Lifecycle.js';
import { MapRequestError } from './map-request.js';
import { trapDialogTab } from './modal-focus.js';
import { ObjectIconPicker } from './ObjectIconPicker.js';
import { CustomFieldValueEditor } from './ObjectTypes.js';
import type { ObjectEditor } from './ObjectWork.js';
import './object-dialog.css';

/** One complete object proposal; shared saving belongs to the household owner. */
export function ObjectDialog({
  initial,
  active,
  isNew,
  householdId,
  restoreFocus,
  types,
  onStage,
  onCheck,
  onClose,
  onDirty,
  onConfirmed,
}: {
  initial: ObjectEditor;
  active: boolean;
  isNew: boolean;
  householdId: string;
  restoreFocus?: () => void;
  types: ObjectType[];
  onStage: (editor: ObjectEditor, stagingId: string, image?: File | null) => Promise<MapDraft>;
  onCheck: () => Promise<MapState>;
  onClose: () => void;
  onDirty: (dirty: boolean) => void;
  onConfirmed: (id: string, relationships: boolean, restoreFocus: () => void) => void;
}) {
  const prefix = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const name = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const correction = useRef<string | null>(null);
  const opener = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const returnFocus = useRef(
    restoreFocus ??
      (() => {
        if (opener.current?.isConnected && !opener.current.closest('[hidden], [inert]'))
          opener.current.focus({ preventScroll: true });
      }),
  ).current;
  const [editor, setEditor] = useState(initial);
  const { register } = useFormLeave();
  const [leave, setLeave] = useState<{ proceed: () => void; cancel: () => void } | null>(null);
  const [pending, setPending] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const requestLock = useRef(false);
  const attempt = useRef<{
    stagingId: string;
    editor: ObjectEditor;
    relationships: boolean;
  } | null>(null);
  const busy = pending || unknown;
  const [image, setImage] = useState<File | null | undefined>();
  const [imagePreview, setImagePreview] = useState<string>();
  const imageRead = useRef(0);
  const comparable = (value: ObjectValue) => ({
    typeId: value.typeId,
    name: value.name,
    description: value.description,
    identity: value.identity,
    lifecycle: value.lifecycle,
    profileImageId: value.profileImageId,
    iconId: value.iconId,
    customValues: Object.keys(value.customValues ?? {}).length ? value.customValues : undefined,
    financialFacts: Object.keys(value.financialFacts ?? {}).length
      ? value.financialFacts
      : undefined,
  });
  const dirty =
    !sameConflictValue(comparable(editor.value), comparable(initial.value)) ||
    image instanceof File;
  useLayoutEffect(() => {
    onDirty(dirty || busy);
    return () => onDirty(false);
  }, [dirty, busy, onDirty]);
  const guard = useRef<FormLeaveGuard>({
    active: () => false,
    leave: (_proceed: () => void, _cancel: () => void) => {},
  });
  guard.current.active = () => true;
  guard.current.retain = (pathname, search) =>
    pathname === `/households/${encodeURIComponent(householdId)}` &&
    new URLSearchParams(search).has('report');
  guard.current.leave = (proceed, cancel) => {
    if (busy) {
      setError(
        unknown
          ? 'Kontrollera om ändringen lades i utkastet innan du lämnar formuläret.'
          : 'Vänta tills ändringen har bekräftats innan du lämnar formuläret.',
      );
      cancel();
    } else if (dirty) setLeave({ proceed, cancel });
    else {
      onClose();
      proceed();
    }
  };
  useLayoutEffect(() => register(guard.current), [register]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  function close() {
    guard.current.leave(onClose, () => {});
  }
  const [error, setError] = useState('');
  const [section, setSection] = useState('Grunduppgifter');
  const type = types.find((type) => type.id === editor.value.typeId);
  const presentation = objectTypePresentation(type ?? {});
  const properties = objectProperties(type ?? {});
  const placedBuiltins = new Set(
    properties
      .filter((property) => property.kind === 'builtin' && property.sectionId)
      .map((property) => property.ref),
  );
  function description(label: string) {
    return (
      <div className="object-wide">
        <label htmlFor={`${prefix}-description`}>{label}</label>
        <textarea
          id={`${prefix}-description`}
          rows={4}
          maxLength={2000}
          value={editor.value.description}
          onChange={(event) => change({ ...editor.value, description: event.target.value })}
        />
      </div>
    );
  }
  function propertyEditor(property: ObjectProperty) {
    if (property.kind === 'custom')
      return (
        <CustomFieldValueEditor
          field={property.field}
          value={editor.value.customValues?.[property.field.id]}
          onChange={(answer) => {
            const customValues = { ...editor.value.customValues };
            if (answer === undefined) delete customValues[property.field.id];
            else customValues[property.field.id] = answer;
            change({ ...editor.value, customValues });
          }}
        />
      );
    const key = property.field.key;
    if (key === 'description') return description(property.name);
    const field = financialFields.find((field) => field.key === key);
    return field ? (
      <FinancialFactEditor
        field={field}
        label={property.name}
        fact={editor.value.financialFacts?.[field.key]}
        onChange={(fact) => {
          const financialFacts = { ...editor.value.financialFacts };
          if (fact) financialFacts[field.key] = fact;
          else delete financialFacts[field.key];
          change({ ...editor.value, financialFacts });
        }}
      />
    ) : null;
  }
  const [typeChange, setTypeChange] = useState<{ type: ObjectType; lost: string[] } | null>(null);
  const [errors, setErrors] = useState<
    { id: string; label: string; message: string; section: string }[]
  >([]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reveal the selected section before focusing its pending correction.
  useLayoutEffect(() => {
    if (correction.current) {
      document.getElementById(correction.current)?.focus();
      correction.current = null;
    }
  }, [section, errors]);
  useLayoutEffect(() => {
    if (errors.length) summary.current?.focus();
  }, [errors]);
  function change(value: ObjectValue) {
    setEditor({ ...editor, value });
  }
  function changeType(next: ObjectType) {
    // Own-field identity belongs to its type, even if another type reuses an ID.
    const lost = Object.keys(editor.value.customValues ?? {});
    if (lost.length) setTypeChange({ type: next, lost });
    else applyType(next, []);
  }
  function applyType(next: ObjectType, lost: string[]) {
    const customValues = { ...editor.value.customValues };
    for (const id of lost) delete customValues[id];
    setEditor({
      ...editor,
      typeRevision: next.revision,
      value: { ...editor.value, typeId: next.id, customValues },
    });
    setTypeChange(null);
  }
  function accordion(title: string, key: string, body: ReactNode) {
    return (
      <section
        key={key}
        className="object-form-section"
        data-open={section === key}
        data-section={key}
      >
        <h3>
          <button
            type="button"
            aria-expanded={section === key}
            aria-controls={`${prefix}-${key}`}
            onClick={() => toggle(key)}
          >
            <span aria-hidden="true">{section === key ? '▾' : '▸'}</span> {title}
          </button>
        </h3>
        <div className="object-form-grid" id={`${prefix}-${key}`} hidden={section !== key}>
          {body}
        </div>
      </section>
    );
  }
  function validate() {
    name.current?.setCustomValidity(editor.value.name.trim() ? '' : 'Ange objektets namn.');
    const problems = [...(form.current?.elements ?? [])].flatMap((element) => {
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        )
      )
        return [];
      element.removeAttribute('aria-invalid');
      if (element.checkValidity()) return [];
      element.setAttribute('aria-invalid', 'true');
      return [
        {
          id: element.id,
          label: [...(element.labels ?? [])]
            .map((label) => label.textContent)
            .join(' ')
            .trim(),
          message: element.validationMessage,
          section:
            element.closest<HTMLElement>('[data-section]')?.dataset.section ?? 'Grunduppgifter',
        },
      ];
    });
    setErrors(problems);
    return !problems.length;
  }
  function toggle(title: string) {
    setSection(section === title ? '' : title);
  }
  const editingFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      dialog.current?.style.setProperty(
        '--object-viewport-height',
        `${viewport?.height ?? window.innerHeight}px`,
      );
      dialog.current?.style.setProperty('--object-viewport-top', `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  useLayoutEffect(() => {
    const modal = dialog.current;
    if (active) {
      modal?.showModal();
      (editingFocus.current?.isConnected ? editingFocus.current : name.current)?.focus();
    } else {
      if (document.activeElement instanceof HTMLElement && modal?.contains(document.activeElement))
        editingFocus.current = document.activeElement;
      modal?.close();
    }
  }, [active]);
  useLayoutEffect(() => {
    const modal = dialog.current;
    return () => {
      modal?.close();
      const afterClose = document.activeElement;
      requestAnimationFrame(() => {
        if (
          !document.querySelector('dialog:modal') &&
          (document.activeElement === afterClose || document.activeElement === document.body)
        )
          returnFocus();
      });
    };
  }, [returnFocus]);
  async function submit(relationships: boolean) {
    if (requestLock.current || busy || !validate()) return;
    if (!isNew && !dirty) {
      onConfirmed(editor.id, relationships, returnFocus);
      return;
    }
    setPending(true);
    setError('');
    requestLock.current = true;
    const stagingId = crypto.randomUUID();
    attempt.current = { stagingId, editor, relationships };
    try {
      await onStage(editor, stagingId, image);
      onConfirmed(editor.id, relationships, returnFocus);
    } catch (failure) {
      if (!(failure instanceof MapRequestError) || failure.status >= 500) {
        setUnknown(true);
        setError(
          'Det är oklart om ändringen lades i utkastet. Kontrollera utfallet innan du försöker igen. Alla uppgifter finns kvar.',
        );
      } else {
        requestLock.current = false;
        attempt.current = null;
        setError(
          failure instanceof Error &&
            ['invalid_image', 'image_processing_failed', 'image_size'].includes(failure.message)
            ? 'Profilbilden kunde inte läggas i utkastet. Välj en giltig PNG-, JPEG- eller WebP-bild på högst 10 MB. Alla uppgifter finns kvar.'
            : 'Ändringen kunde inte bekräftas. Dina uppgifter finns kvar.',
        );
      }
    } finally {
      setPending(false);
    }
  }
  async function check() {
    if (pending || !unknown || !attempt.current) return;
    setPending(true);
    try {
      const latest = await onCheck();
      const current = attempt.current;
      const staged = latest.draft.changes.find((change) => change.id === current.editor.id);
      if (staged?.stagingId === current.stagingId)
        onConfirmed(current.editor.id, current.relationships, returnFocus);
      else if (
        latest.draft.version === current.editor.version &&
        latest.contentVersion === current.editor.contentVersion
      ) {
        requestLock.current = false;
        attempt.current = null;
        setUnknown(false);
        setError(
          'Kontrollen visar att ändringen inte lades i utkastet. Alla uppgifter finns kvar. Du kan försöka igen.',
        );
      } else
        setError(
          'Utkastet har ändrats och utfallet kan inte bekräftas. Dina uppgifter finns kvar. Kontrollera samma ändring igen innan du lämnar eller försöker igen.',
        );
    } catch {
      setError(
        'Utkastet kunde inte kontrolleras. Dina uppgifter finns kvar. Kontrollera igen innan du försöker lägga ändringen i utkastet.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="object-dialog object-dialog-C"
      aria-labelledby={`${prefix}-title`}
      onKeyDown={(event) => {
        event.stopPropagation();
        trapDialogTab(event);
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) close();
      }}
    >
      <header>
        <div>
          <h2 id={`${prefix}-title`}>{isNew ? 'Nytt objekt' : `Redigera ${initial.value.name}`}</h2>
          <p>Ändringar läggs i ditt utkast. Kartan sparas separat.</p>
        </div>
        <button type="button" aria-label="Stäng objektdialogen" disabled={busy} onClick={close}>
          ×
        </button>
      </header>
      <form
        ref={form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(false);
        }}
      >
        <div className="object-dialog-body">
          {errors.length > 0 && (
            <div
              ref={summary}
              role="alert"
              aria-label="Formuläret innehåller fel"
              tabIndex={-1}
              className="object-error-summary"
            >
              <h3>Rätta uppgifterna innan du lägger dem i utkastet</h3>
              <ul>
                {errors.map((problem) => (
                  <li key={problem.id}>
                    <a
                      href={`#${problem.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        correction.current = problem.id;
                        setSection(problem.section);
                        if (section === problem.section) {
                          document.getElementById(problem.id)?.focus();
                          correction.current = null;
                        }
                      }}
                    >
                      {problem.label}: {problem.message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
          <p role="status" aria-label="Tillägg till utkastet">
            {pending
              ? unknown
                ? 'Kontrollerar utkastet…'
                : 'Lägger ändringen i ditt utkast…'
              : ''}
          </p>
          {unknown && (
            <button type="button" disabled={pending} onClick={() => void check()}>
              Kontrollera om ändringen lades i utkastet
            </button>
          )}
          <fieldset disabled={busy} className="object-field-container">
            <section
              className="object-form-section"
              data-open={section === 'Grunduppgifter'}
              data-section="Grunduppgifter"
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={section === 'Grunduppgifter'}
                  aria-controls={`${prefix}-basic`}
                  onClick={() => toggle('Grunduppgifter')}
                >
                  <span aria-hidden="true">{section === 'Grunduppgifter' ? '▾' : '▸'}</span>{' '}
                  Grunduppgifter
                </button>
              </h3>
              <div
                className="object-form-grid"
                id={`${prefix}-basic`}
                hidden={section !== 'Grunduppgifter'}
              >
                <label>
                  Namn
                  <input
                    ref={name}
                    id={`${prefix}-name`}
                    required
                    maxLength={200}
                    value={editor.value.name}
                    onChange={(event) =>
                      setEditor({ ...editor, value: { ...editor.value, name: event.target.value } })
                    }
                  />
                </label>
                <label>
                  Objekttyp
                  <select
                    aria-label="Objekttyp"
                    value={editor.value.typeId}
                    onChange={(event) => {
                      const next = types.find((type) => type.id === event.target.value);
                      if (next) changeType(next);
                    }}
                  >
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Identitet
                  <select
                    aria-label="Identitet"
                    value={editor.value.identity ?? 'identified'}
                    onChange={(event) => {
                      const value = { ...editor.value };
                      if (event.target.value === 'identified') delete value.identity;
                      else value.identity = event.target.value as 'unspecified' | 'unresolved';
                      change(value);
                    }}
                  >
                    <option value="identified">Identifierat objekt</option>
                    <option value="unspecified">Ospecificerat objekt</option>
                    <option value="unresolved">Obesvarad identitetsfråga</option>
                  </select>
                </label>
                {!placedBuiltins.has('builtin:description') && description('Beskrivning')}
              </div>
            </section>
            {presentation.sections.flatMap((customSection) => {
              const entries = properties.filter(
                (property) => property.sectionId === customSection.id,
              );
              return entries.length
                ? [
                    accordion(
                      customSection.name,
                      `custom-${customSection.id}`,
                      entries.map((property) => (
                        <div key={property.ref}>{propertyEditor(property)}</div>
                      )),
                    ),
                  ]
                : [];
            })}
            <section
              className="object-form-section"
              data-open={section === 'Ekonomiska uppgifter'}
              data-section="Ekonomiska uppgifter"
            >
              <h3>
                <button
                  type="button"
                  aria-expanded={section === 'Ekonomiska uppgifter'}
                  aria-controls={`${prefix}-economy`}
                  onClick={() => toggle('Ekonomiska uppgifter')}
                >
                  <span aria-hidden="true">{section === 'Ekonomiska uppgifter' ? '▾' : '▸'}</span>{' '}
                  Ekonomiska uppgifter
                </button>
              </h3>
              <div
                className="object-form-grid"
                id={`${prefix}-economy`}
                hidden={section !== 'Ekonomiska uppgifter'}
              >
                {financialFields
                  .filter((field) => !placedBuiltins.has(`builtin:${field.key}`))
                  .map((field) => (
                    <FinancialFactEditor
                      key={field.key}
                      field={field}
                      label={
                        properties.find((property) => property.ref === `builtin:${field.key}`)?.name
                      }
                      fact={editor.value.financialFacts?.[field.key]}
                      onChange={(fact) => {
                        const financialFacts = { ...editor.value.financialFacts };
                        if (fact) financialFacts[field.key] = fact;
                        else delete financialFacts[field.key];
                        setEditor({ ...editor, value: { ...editor.value, financialFacts } });
                      }}
                    />
                  ))}
              </div>
            </section>
            {accordion(
              'Livscykel och utseende',
              'appearance',
              <>
                <div className="object-wide">
                  <label htmlFor={`${prefix}-image`}>Profilbild</label>
                  <input
                    id={`${prefix}-image`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setImage(file);
                      setImagePreview(undefined);
                      const read = ++imageRead.current;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (read === imageRead.current && typeof reader.result === 'string')
                          setImagePreview(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <p>
                    Bilden och hela formuläret läggs i utkastet tillsammans. PNG, JPEG eller WebP,
                    högst 10 MB.
                  </p>
                  {(imagePreview || (image === undefined && editor.value.profileImageId)) && (
                    <img
                      width="96"
                      height="96"
                      alt={`Profilbild för ${editor.value.name || 'objektet'}`}
                      src={
                        imagePreview ??
                        `/api/households/${encodeURIComponent(householdId)}/profile-images/${encodeURIComponent(editor.value.profileImageId ?? '')}`
                      }
                    />
                  )}
                  {(image || editor.value.profileImageId) && (
                    <button
                      type="button"
                      onClick={() => {
                        imageRead.current++;
                        setImage(null);
                        setImagePreview(undefined);
                        const value = { ...editor.value };
                        delete value.profileImageId;
                        change(value);
                      }}
                    >
                      Ta bort profilbilden ur formuläret
                    </button>
                  )}
                </div>
                <div className="object-wide">
                  <LifecycleEditor
                    kind="object"
                    value={editor.value.lifecycle}
                    onChange={(lifecycle) => {
                      const value = { ...editor.value };
                      if (lifecycle) value.lifecycle = lifecycle;
                      else delete value.lifecycle;
                      change(value);
                    }}
                  />
                </div>
                <div className="object-wide">
                  <ObjectIconPicker
                    local
                    value={editor.value.iconId}
                    name={editor.value.name}
                    hasImage={Boolean(editor.value.profileImageId)}
                    disabled={busy}
                    needsText={false}
                    onStageText={async () => false}
                    onChange={async (iconId) => {
                      const value = { ...editor.value };
                      if (iconId) value.iconId = iconId;
                      else delete value.iconId;
                      change(value);
                      return true;
                    }}
                  />
                </div>
              </>,
            )}
          </fieldset>
        </div>
        <footer>
          <button type="button" disabled={busy} onClick={close}>
            Avbryt
          </button>
          <button type="submit" className="primary" disabled={busy}>
            Lägg i utkastet och stäng
          </button>
          <button type="button" disabled={busy} onClick={() => void submit(true)}>
            Lägg i utkastet och öppna samband
          </button>
        </footer>
      </form>
      {typeChange && (
        <ObjectTypeLossDialog
          fields={typeChange.lost.map((id) => ({
            name: type?.fields?.find((field) => field.id === id)?.name ?? id,
            value: editor.value.customValues?.[id],
          }))}
          onCancel={() => setTypeChange(null)}
          onConfirm={() => applyType(typeChange.type, typeChange.lost)}
        />
      )}
      {leave && (
        <FormLossDialog
          onCancel={() => {
            leave.cancel();
            setLeave(null);
          }}
          onConfirm={() => {
            const proceed = leave.proceed;
            setLeave(null);
            onClose();
            proceed();
          }}
        />
      )}
    </dialog>
  );
}

function FormLossDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <ObjectFormGuard
      title="Lämna ändrade uppgifter?"
      confirmLabel="Kasta ändringarna och fortsätt"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>
        Ändringar som ännu inte lagts i ditt utkast går förlorade. Redan lagda förslag finns kvar.
      </p>
    </ObjectFormGuard>
  );
}

function ObjectTypeLossDialog({
  fields,
  onCancel,
  onConfirm,
}: {
  fields: { name: string; value: unknown }[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ObjectFormGuard
      title="Ta bort tidigare egna fält?"
      confirmLabel="Ta bort fältvärdena och byt typ"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>
        Vid typbytet försvinner följande egna fält från formuläret. Bekräfta för att ta bort
        värdena.
      </p>
      <h3>Berörda egna fält</h3>
      <ul>
        {fields.map((field) => (
          <li key={field.name}>
            {field.name}:{' '}
            {typeof field.value === 'boolean'
              ? field.value
                ? 'Ja'
                : 'Nej'
              : String(field.value ?? '')}
          </li>
        ))}
      </ul>
    </ObjectFormGuard>
  );
}

/** The active guard owns Escape, tabbing and the return to the exact editing field. */
function ObjectFormGuard({
  title,
  confirmLabel,
  children,
  onCancel,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modal = dialog.current;
    modal?.showModal();
    cancel.current?.focus();
    return () => {
      modal?.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="object-type-loss"
      aria-labelledby={id}
      onKeyDown={(event) => {
        event.stopPropagation();
        trapDialogTab(event);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        <button type="button" aria-label="Stäng dialogen" onClick={onCancel}>
          ×
        </button>
      </header>
      <div className="object-type-loss-body">{children}</div>
      <footer>
        <button ref={cancel} type="button" className="primary" onClick={onCancel}>
          Fortsätt redigera
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </footer>
    </dialog>
  );
}
