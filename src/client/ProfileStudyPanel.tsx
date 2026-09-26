// Kastbart bildavsnitt i B:s detaljer. Bildvalet blir direkt ett privat förslag.
import { type ChangeEvent, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ProfileStudyModel } from './profile-study-model.js';
import './profile-study-panel.css';

type ProfileStudyPanelProps = {
  objectId: string;
  name: string;
  model: ProfileStudyModel;
  creation: boolean;
  unsent: boolean;
  blocked: boolean;
  editing: boolean;
  onStageText: () => void;
  onEdit: () => void;
  onChange: () => void;
};

export function ProfileStudyPanel({
  objectId,
  name,
  model,
  creation,
  unsent,
  blocked,
  editing,
  onStageText,
  onEdit,
  onChange,
}: ProfileStudyPanelProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const focusPicker = useRef(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const value = model.current(objectId);
  const staged = Object.hasOwn(model.staged, objectId);
  const loading = Boolean(model.loading[objectId]);
  const error = model.errors[objectId];
  const needsText = creation || unsent;
  const disabled = blocked || needsText || loading;
  const status = loading
    ? 'Behandlar bilden…'
    : staged
      ? value
        ? 'Ny profilbild i ditt privata utkast'
        : 'Profilbilden tas bort i ditt privata utkast'
      : value
        ? 'Delad profilbild'
        : 'Ingen profilbild';

  useLayoutEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useLayoutEffect(() => {
    if (!focusPicker.current || !editing || blocked || loading) return;
    if (needsText) stageRef.current?.focus();
    else fileRef.current?.focus();
    focusPicker.current = false;
  }, [editing, needsText, blocked, loading]);

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || disabled) return;
    if (await model.pick(objectId, file)) onChange();
  }

  function edit() {
    focusPicker.current = true;
    onEdit();
  }

  return (
    <section className="psi-profile ds-section" aria-labelledby={`${id}-heading`}>
      <div className="psi-heading">
        <h3 id={`${id}-heading`}>Profilbild</h3>
        <span>Valfritt</span>
      </div>
      <div className="psi-content">
        <div className="psi-preview" aria-busy={loading}>
          {value && value.url !== failedUrl ? (
            <img
              src={value.url}
              width={value.width}
              height={value.height}
              alt={`Profilbild för ${name || 'objektet'}`}
              onError={() => setFailedUrl(value.url)}
            />
          ) : (
            <div className="psi-empty" aria-hidden="true">
              {name.trim().slice(0, 1).toLocaleUpperCase('sv') || '—'}
            </div>
          )}
          <div className="psi-image-caption">
            <p className="psi-status" role="status" aria-live="polite">
              {status}
            </p>
            {value && <p className="psi-file-name">{value.fileName}</p>}
            {value && value.url === failedUrl && (
              <p role="alert">Profilbilden kunde inte visas. Välj bilden igen.</p>
            )}
          </div>
        </div>

        {editing ? (
          <>
            <p id={`${id}-formats`} className="psi-help">
              JPEG, PNG eller WebP, högst 10 MB och 40 miljoner bildpunkter. Bilden blir högst 300 ×
              300 bildpunkter. En animerad bild blir en stillbild.
            </p>
            <p id={`${id}-draft`} className="psi-help">
              Bildvalet blir direkt ett privat förslag. Spara hela utkastet för att dela det med
              hushållet.
            </p>
            {needsText && (
              <div className="psi-stage-text">
                <p id={`${id}-stage-hint`}>
                  {creation
                    ? 'Lägg först objektet i ditt utkast. Sedan kan du välja en profilbild.'
                    : 'Lägg först dina oskickade uppgifter i utkastet. Sedan kan du ändra profilbilden.'}
                </p>
                <button
                  type="button"
                  ref={stageRef}
                  onClick={() => {
                    focusPicker.current = true;
                    onStageText();
                  }}
                  disabled={blocked || loading}
                >
                  Lägg uppgifterna i utkastet först
                </button>
              </div>
            )}
            <label className="psi-picker" htmlFor={`${id}-file`}>
              {value ? 'Byt profilbild' : 'Välj profilbild'}
              <input
                id={`${id}-file`}
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={disabled}
                aria-invalid={Boolean(error)}
                aria-describedby={[
                  `${id}-formats`,
                  `${id}-draft`,
                  needsText ? `${id}-stage-hint` : '',
                  error ? `${id}-error` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onChange={pick}
              />
            </label>
            {error && (
              <p id={`${id}-error`} className="psi-error" role="alert" tabIndex={-1} ref={errorRef}>
                {error}
              </p>
            )}
            {value && (
              <button
                className="psi-remove"
                type="button"
                disabled={disabled}
                onClick={() => {
                  model.remove(objectId);
                  onChange();
                  fileRef.current?.focus();
                }}
              >
                Ta bort profilbild
              </button>
            )}
            {blocked && <p className="psi-help">Bildändringar är tillfälligt blockerade.</p>}
          </>
        ) : (
          <button className="ds-section-edit" type="button" onClick={edit} disabled={blocked}>
            {value ? 'Ändra profilbild' : 'Lägg till profilbild'}
          </button>
        )}
      </div>
    </section>
  );
}

export function ProfileStudyDraft({
  model,
  objects,
}: {
  model: ProfileStudyModel;
  objects: { id: string; name: string }[];
}) {
  const entries = Object.entries(model.staged);
  if (!entries.length) return null;
  return (
    <section className="psi-draft" aria-label="Bildförslag i utkastet">
      <h3>Profilbilder</h3>
      {entries.map(([objectId, after]) => {
        const name = objects.find((object) => object.id === objectId)?.name ?? 'Objekt';
        const before = model.saved[objectId] ?? null;
        return (
          <article className="psi-draft-object" key={objectId}>
            <h4>{name}</h4>
            <div className="psi-comparison">
              {[
                { label: 'Gemensam karta', image: before },
                { label: 'Ditt utkast', image: after },
              ].map(({ label, image }) => (
                <div key={label}>
                  <h5>{label}</h5>
                  {image ? (
                    <>
                      <img
                        src={image.url}
                        width={image.width}
                        height={image.height}
                        alt={`${label}: profilbild för ${name}`}
                      />
                      <p className="psi-file-name">{image.fileName}</p>
                    </>
                  ) : (
                    <p>Ingen profilbild</p>
                  )}
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
