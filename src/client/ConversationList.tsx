import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { RetainedConversation } from '../shared/text-assistant.js';
import type { Conversation } from './use-conversation.js';
import { WorkspaceIcon } from './WorkspaceTools.js';

function date(value?: number) {
  if (value === undefined) return 'Datum saknas';
  const time = new Date(value);
  return <time dateTime={time.toISOString()}>{time.toLocaleString('sv-SE')}</time>;
}

function ConversationInformation({ row, close }: { row: RetainedConversation; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [status, setStatus] = useState('');
  useLayoutEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const filter = `and(eq(metadata_key, "conversation_id"), eq(metadata_value, "${row.id}"))`;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('Kopierat.');
    } catch {
      setStatus('Markera texten och kopiera den manuellt.');
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={id}
      className="conversation-model-dialog"
      onCancel={close}
    >
      <h2 id={id}>Samtalsinformation</h2>
      <dl>
        <dt>Titel</dt>
        <dd>{row.title}</dd>
        <dt>Skapat</dt>
        <dd>{date(row.createdAt)}</dd>
        <dt>Senaste begäran</dt>
        <dd>{date(row.lastRequestAt)}</dd>
        <dt>Samtals-ID</dt>
        <dd>
          <code>{row.id}</code>
        </dd>
        <dt>LangSmith-filter</dt>
        <dd>
          <code>{filter}</code>
        </dd>
      </dl>
      <p>
        Filtret hittar de spår som har skickats för samtalet. Om sändningen är avstängd eller
        leveranser saknas kan träffar saknas.
      </p>
      <button type="button" onClick={() => void copy(row.id)}>
        Kopiera samtals-ID
      </button>
      <button type="button" onClick={() => void copy(filter)}>
        Kopiera LangSmith-filter
      </button>
      <p role="status">{status}</p>
      <button type="button" onClick={close}>
        Stäng
      </button>
    </dialog>
  );
}

export function ConversationList({
  conversation,
  onSelected,
}: {
  conversation: Conversation;
  onSelected: () => void;
}) {
  const [information, setInformation] = useState<string>();
  const read = useRef(conversation.listRetained);
  read.current = conversation.listRetained;
  useEffect(() => {
    let closed = false;
    let timer: number | undefined;
    function schedule() {
      if (!closed) timer = window.setTimeout(poll, 3000);
    }
    function poll() {
      void read.current?.().then(schedule, schedule);
    }
    queueMicrotask(() => {
      if (!closed) poll();
    });
    return () => {
      closed = true;
      window.clearTimeout(timer);
    };
  }, []);
  const rows = conversation.retainedConversations;
  const detail = rows?.find((row) => row.id === information);
  return (
    <section className="conversation-list" aria-label="Samtal">
      <h3>Samtal</h3>
      {conversation.listError && <p role="alert">{conversation.listError}</p>}
      {rows === undefined ? (
        !conversation.listError && <p>Hämtar samtal…</p>
      ) : rows.length === 0 ? (
        <p>Inga samtal ännu.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                disabled={conversation.switchBlocked}
                aria-current={row.id === conversation.session?.id ? 'true' : undefined}
                onClick={async () => {
                  if (await conversation.openRetained?.(row.id)) onSelected();
                }}
              >
                {row.title}
              </button>
              <button
                type="button"
                aria-label="Samtalsinformation"
                title="Samtalsinformation"
                onClick={() => setInformation(row.id)}
              >
                <WorkspaceIcon name="info" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {detail && <ConversationInformation row={detail} close={() => setInformation(undefined)} />}
    </section>
  );
}
