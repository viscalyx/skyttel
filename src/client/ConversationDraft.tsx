import { draftChangeCount, type MapDraft } from '../shared/map.js';
import {
  objectDifferences,
  relationshipDifferences,
  typeDifferences,
} from './DraftChangeSummary.js';
import { draftProposalDescriptors } from './draft-proposal-descriptors.js';
import { WorkspaceIcon } from './WorkspaceTools.js';

export { draftChangeCount as draftCount } from '../shared/map.js';

/** The same plus, pencil and cross as the map, with a textual action too. */
function symbol(before: unknown, after: unknown) {
  const action = after ? (before ? 'Ändra' : 'Lägg till') : 'Ta bort';
  return (
    <>
      <span
        className="conversation-draft-symbol"
        data-action={after ? (before ? 'changed' : 'added') : 'removed'}
        aria-hidden="true"
      >
        {after ? (before ? '✎' : '+') : '×'}
      </span>
      <span className="visually-hidden">{action}</span>
    </>
  );
}

/** One row per proposal, including relationships and the household's own types. */
export function ConversationDraft({
  draft,
  onOpen,
  onRemove,
  warnings,
  blocked = false,
}: {
  draft?: MapDraft;
  onOpen?: (key: string) => void;
  onRemove?: (key: string) => void;
  warnings?: Record<string, string>;
  blocked?: boolean;
}) {
  if (!draftChangeCount(draft) || !draft) return <p>Utkastet är tomt.</p>;
  const rows = draftProposalDescriptors(draft).map((proposal) => {
    const differences =
      proposal.kind === 'Objekt'
        ? objectDifferences(proposal.change)
        : proposal.kind === 'Samband'
          ? relationshipDifferences(proposal.change)
          : proposal.change.before && proposal.change.after
            ? typeDifferences(proposal.change.before, proposal.change.after)
            : [];
    return {
      key: proposal.key,
      name: proposal.name,
      before: proposal.change.before,
      after: proposal.change.after,
      type:
        proposal.kind === 'Objekt' || proposal.kind === 'Samband'
          ? proposal.change.type.name
          : proposal.kind,
      differences,
    };
  });
  return (
    <div className="conversation-draft-table">
      <table aria-label="Osparade ändringar">
        <thead>
          <tr>
            <th scope="col">Symbol</th>
            <th scope="col">Namn</th>
            <th scope="col">Typ</th>
            <th scope="col">Vad som ändras</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={onOpen ? 'draft-clickable-row' : undefined}
              onClick={
                onOpen
                  ? (event) => {
                      if (!(event.target as HTMLElement).closest('button')) onOpen(row.key);
                    }
                  : undefined
              }
            >
              <td>{symbol(row.before, row.after)}</td>
              <th scope="row">
                {onOpen ? (
                  <button
                    type="button"
                    id={`draft-read-${row.key}`}
                    className="draft-open-proposal"
                    aria-label={`Visa förslaget: ${row.name}`}
                    aria-haspopup="dialog"
                    onClick={() => onOpen(row.key)}
                  >
                    {row.name}
                  </button>
                ) : (
                  row.name
                )}
              </th>
              <td>{row.type}</td>
              <td>
                <div className="draft-change">
                  <div>
                    {row.differences.length
                      ? row.differences.map((line) => <div key={line}>{line}</div>)
                      : row.after
                        ? row.before
                          ? 'Ändras'
                          : 'Läggs till'
                        : 'Tas bort'}
                  </div>
                  {onOpen && (
                    <button
                      type="button"
                      className="draft-icon draft-remove"
                      disabled={blocked || !onRemove}
                      title={`Ta bort förslaget: ${row.name}`}
                      aria-label={`Ta bort förslaget: ${row.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove?.(row.key);
                      }}
                    >
                      <WorkspaceIcon name="trash" />
                    </button>
                  )}
                </div>
                {warnings?.[row.key] && (
                  <p className="draft-row-warning">
                    <WorkspaceIcon name="warning" />
                    {warnings[row.key]}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
