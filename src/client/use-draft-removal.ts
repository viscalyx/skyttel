import { useLayoutEffect, useRef, useState } from 'react';
import { type DraftDiscardPlan, draftProposalRefs } from '../shared/draft-discard.js';
import type { MapState } from '../shared/map.js';
import { request } from './map-request.js';

export type DraftRemovalOwner = {
  path: string;
  onChange: (state: MapState) => void;
  onStatus: (message: string) => void;
};
type RemovalFocus = { origin: HTMLElement | null; keys: string[] };
export type DraftRemovalReview = {
  body: Record<string, unknown>;
  plan: DraftDiscardPlan;
  focus: RemovalFocus;
  error?: string;
};

export function useDraftRemoval(state: MapState, disabled: boolean, owner?: DraftRemovalOwner) {
  const [pending, setPending] = useState(false);
  const [review, setReview] = useState<DraftRemovalReview | null>(null);
  const current = useRef(owner);
  current.current = owner;
  const content = useRef(state.contentVersion);
  content.current = state.contentVersion;
  const restore = useRef<RemovalFocus | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new household or imported content retires the old review and requests.
  useLayoutEffect(() => {
    setReview(null);
    setPending(false);
    restore.current = null;
  }, [owner?.path, state.contentVersion]);
  function isCurrent() {
    return current.current?.path === owner?.path && content.current === state.contentVersion;
  }
  useLayoutEffect(() => {
    if (pending || !restore.current) return;
    const target = restore.current;
    restore.current = null;
    if (document.activeElement !== document.body && document.activeElement !== target.origin)
      return;
    const available = new Set(draftProposalRefs(state.draft).map(({ key }) => key));
    const key = target.keys.find((value) => available.has(value));
    const button = key ? document.getElementById(`draft-remove-${key}`) : null;
    (button ?? document.getElementById('text-draft-title'))?.focus();
  }, [pending, state.draft]);

  async function apply(selection: DraftRemovalReview) {
    if (!owner) return;
    const { state: result } = await request<{ state: MapState }>(`${owner.path}/discard-review`, {
      ...selection.body,
      confirmation: selection.plan,
    });
    if (!isCurrent()) return;
    const active = document.activeElement;
    restore.current = {
      ...selection.focus,
      origin:
        active instanceof HTMLElement && active.closest('[data-draft-discard]')
          ? active
          : selection.focus.origin,
    };
    setReview(null);
    owner.onChange(result);
    owner.onStatus(
      selection.body.kind === 'all'
        ? 'Hela ditt utkast har tagits bort. Den gemensamma kartan är inte ändrad.'
        : `${selection.plan.removed.length > 1 ? 'Förslagen är borttagna' : 'Förslaget är borttaget'}. Den gemensamma kartan är inte ändrad.`,
    );
  }

  async function confirm() {
    if (!review || !owner || pending || disabled) return;
    setPending(true);
    try {
      await apply(review);
    } catch {
      if (isCurrent())
        setReview({
          ...review,
          error:
            'Borttagningen kunde inte bekräftas. Hämta aktuellt utkast för att kontrollera resultatet och granska beroendena igen.',
        });
    } finally {
      if (isCurrent()) setPending(false);
    }
  }

  async function refresh() {
    if (!review || !owner || pending) return;
    setPending(true);
    try {
      const latest = await request<MapState>(owner.path);
      if (!isCurrent()) return;
      owner.onChange(latest);
      const target = draftProposalRefs(latest.draft).find(
        ({ kind, id }) => kind === review.body.kind && id === review.body.id,
      );
      if (!target && (review.body.kind !== 'all' || !draftProposalRefs(latest.draft).length)) {
        setReview(null);
        owner.onStatus('Förslaget finns inte längre i ditt utkast. Aktuellt utkast har hämtats.');
        restore.current = review.focus;
        return;
      }
      const body = {
        ...review.body,
        version: latest.draft.version,
        contentVersion: latest.contentVersion,
      };
      const { plan } = await request<{ plan: DraftDiscardPlan }>(
        `${owner.path}/discard-review`,
        body,
      );
      if (!isCurrent()) return;
      setReview({ ...review, body, plan, error: undefined });
    } catch {
      if (isCurrent())
        setReview({ ...review, error: 'Aktuellt utkast kunde inte hämtas. Försök igen.' });
    } finally {
      if (isCurrent()) setPending(false);
    }
  }

  async function begin(key?: string) {
    if (!owner || disabled || pending) return;
    const entries = draftProposalRefs(state.draft);
    const proposal = entries.find((entry) => entry.key === key);
    if (key && !proposal) return;
    const index = proposal ? entries.indexOf(proposal) : -1;
    const focus = {
      origin: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      keys: key
        ? entries
            .slice(index + 1)
            .concat(entries.slice(0, index).reverse())
            .map((entry) => entry.key)
        : [],
    };
    const body = {
      kind: proposal?.kind ?? 'all',
      ...(proposal ? { id: proposal.id } : {}),
      version: state.draft.version,
      contentVersion: state.contentVersion,
    };
    let selection: DraftRemovalReview | undefined;
    setPending(true);
    try {
      const { plan } = await request<{ plan: DraftDiscardPlan }>(
        `${owner.path}/discard-review`,
        body,
      );
      if (!isCurrent()) return;
      selection = { body, plan, focus };
      if (!key || plan.removed.length > 1 || plan.affected.length) {
        setReview(selection);
        return;
      }
      await apply(selection);
    } catch {
      if (isCurrent()) {
        if (selection)
          setReview({
            ...selection,
            error:
              'Borttagningen kunde inte bekräftas. Hämta aktuellt utkast för att kontrollera resultatet.',
          });
        else
          owner.onStatus(
            'Borttagningen kunde inte bekräftas. Hämta aktuellt utkast och försök igen.',
          );
      }
    } finally {
      if (isCurrent()) setPending(false);
    }
  }
  return {
    remove: owner ? (key: string) => void begin(key) : undefined,
    discard: owner ? () => void begin() : undefined,
    pending,
    review,
    confirm,
    refresh,
    cancel: () => setReview(null),
  };
}
