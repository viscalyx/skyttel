import { useId, useLayoutEffect, useRef } from 'react';
import type { DraftProposalDescriptor } from './draft-proposal-descriptors.js';
import { trapDialogTab } from './modal-focus.js';
import type { DraftRemovalReview } from './use-draft-removal.js';
import { WorkspaceIcon } from './WorkspaceTools.js';

export function DraftDiscardDialog({
  review,
  proposals,
  pending,
  onConfirm,
  onCancel,
  onRefresh,
}: {
  review: DraftRemovalReview;
  proposals: DraftProposalDescriptor[];
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const refreshOrigin = useRef<HTMLElement | null>(null);
  const title = useId();
  useLayoutEffect(() => {
    const element = dialog.current;
    const origin = review.focus.origin;
    element?.showModal();
    cancel.current?.focus();
    return () => {
      element?.close();
      if (origin?.isConnected && !origin.matches(':disabled') && origin.getClientRects().length)
        origin.focus();
    };
  }, [review.focus.origin]);
  useLayoutEffect(() => {
    const origin = refreshOrigin.current;
    if (review.error || !origin) return;
    refreshOrigin.current = null;
    if (!origin.isConnected && document.activeElement === document.body) cancel.current?.focus();
  }, [review.error]);
  return (
    <dialog
      ref={dialog}
      data-draft-discard
      className="draft-read-modal draft-discard-modal"
      aria-labelledby={title}
      onKeyDown={trapDialogTab}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <header>
        <h2 id={title}>
          {review.body.kind === 'all'
            ? 'Ta bort hela utkastet?'
            : 'Ta bort förslaget och dess beroenden?'}
        </h2>
        <button type="button" aria-label="Stäng dialogen" onClick={onCancel}>
          <WorkspaceIcon name="close" />
        </button>
      </header>
      <div className="draft-read-body">
        <p>
          {review.body.kind === 'all'
            ? 'Alla förslag i ditt utkast tas bort. Sparade uppgifter påverkas inte.'
            : 'Följande förslag tas bort ur ditt utkast. Sparade uppgifter påverkas inte.'}
        </p>
        <ul>
          {review.plan.removed.map((key) => {
            const proposal = proposals.find((item) => item.key === key);
            return (
              <li key={key}>
                {proposal?.name} <span className="draft-read-note">· {proposal?.kind}</span>
              </li>
            );
          })}
        </ul>
        {review.plan.affected.length > 0 && (
          <>
            <h3>Förslag som blir kvar men påverkas</h3>
            <p>De här förslagen kan behöva rättas eftersom typen ändras eller saknas.</p>
            <ul aria-label="Förslag som blir kvar men påverkas">
              {review.plan.affected.map(({ key, reason }) => (
                <li key={key}>
                  {proposals.find((item) => item.key === key)?.name} · {reason}
                </li>
              ))}
            </ul>
          </>
        )}
        {review.error && (
          <>
            <p role="alert">{review.error}</p>
            <button
              type="button"
              disabled={pending}
              onClick={(event) => {
                refreshOrigin.current = event.currentTarget;
                onRefresh();
              }}
            >
              Hämta aktuellt utkast
            </button>
          </>
        )}
        {pending && <p role="status">Tar bort förslagen…</p>}
      </div>
      <footer>
        <button ref={cancel} type="button" onClick={onCancel}>
          Avbryt
        </button>
        <button
          type="button"
          className="draft-confirm-remove"
          disabled={pending || !!review.error}
          onClick={onConfirm}
        >
          Ta bort{review.body.kind === 'all' ? ' hela utkastet' : ''}
        </button>
      </footer>
    </dialog>
  );
}
