import { useId, useLayoutEffect, useRef } from 'react';
import { trapDialogTab } from './modal-focus.js';
import type { SaveProgress } from './SaveOperations.js';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './draft-review.css';

export function DraftSaveFollowUp({
  progress,
  onOpen,
  hidden,
}: {
  progress?: SaveProgress;
  onOpen: () => void;
  hidden: boolean;
}) {
  if (!progress || progress.status === 'succeeded') return null;
  return (
    <aside hidden={hidden} aria-label="Aktuellt sparförsök" className="draft-save-follow-up">
      <span>
        {progress.status === 'unknown'
          ? 'Sparandet kunde inte bekräftas.'
          : progress.status === 'rejected'
            ? 'Utkastet kunde inte sparas.'
            : 'Sparandet pågår.'}
      </span>
      <button type="button" onClick={onOpen}>
        Visa sparandet
      </button>
    </aside>
  );
}

export function DraftSaveDialog({
  open,
  progress,
  onClose,
  onCheck,
}: {
  open: boolean;
  progress?: SaveProgress;
  onClose: () => void;
  onCheck: () => void;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const returnHeading = useRef<HTMLElement | null>(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = modal.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      returnHeading.current = opener.current?.closest('.household-table')
        ? document.querySelector<HTMLElement>('.household-table-heading h1')
        : document.getElementById('text-draft-title');
      dialog.showModal();
      heading.current?.focus();
    } else if (!open && dialog.open) {
      const ownsFocus = dialog.contains(document.activeElement);
      dialog.close();
      if (ownsFocus) {
        const candidates = [
          opener.current,
          returnHeading.current,
          document.getElementById('text-draft-title'),
          document.querySelector<HTMLElement>('.household-table-heading h1'),
        ];
        candidates
          .find(
            (element) =>
              element?.isConnected &&
              !element.matches(':disabled') &&
              element.getClientRects().length &&
              !element.closest('[hidden], [inert]'),
          )
          ?.focus();
      }
    }
  }, [open]);
  useLayoutEffect(() => () => modal.current?.close(), []);
  const waiting = progress?.status === 'pending' || progress?.status === 'checking';
  return (
    <dialog
      ref={modal}
      className="draft-read-modal draft-save-modal"
      aria-labelledby={titleId}
      onKeyDown={trapDialogTab}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          Spara utkastet
        </h2>
        <button type="button" aria-label="Stäng dialogen" title="Stäng dialogen" onClick={onClose}>
          <WorkspaceIcon name="close" />
        </button>
      </header>
      <div className="draft-read-body" role="status" aria-live="polite" aria-atomic="true">
        {waiting ? (
          <>
            <p className="draft-saving">
              <WorkspaceIcon name="activity" />
              {progress.status === 'checking' ? 'Kontrollerar sparandet…' : 'Sparar utkastet…'}
            </p>
            <p>Utkastet ligger kvar tills sparandet är bekräftat.</p>
          </>
        ) : progress?.status === 'unknown' ? (
          <>
            <p>Sparandet kunde inte bekräftas.</p>
            <p>
              Kontrollera samma sparförsök igen innan du försöker spara på nytt. Ditt utkast ligger
              kvar under tiden.
            </p>
          </>
        ) : (
          <>
            <p>Utkastet kunde inte sparas.</p>
            <p>
              {progress?.message ??
                'Ditt utkast ligger kvar. Rätta förslagen där du normalt ändrar objekt, samband och typer.'}
            </p>
          </>
        )}
      </div>
      {progress?.status === 'unknown' && (
        <footer>
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget
                .closest('dialog')
                ?.querySelector<HTMLElement>('header button')
                ?.focus();
              onCheck();
            }}
          >
            Kontrollera sparandet igen
          </button>
        </footer>
      )}
    </dialog>
  );
}
