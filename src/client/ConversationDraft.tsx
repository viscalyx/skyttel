import { draftChangeCount, type MapDraft } from '../shared/map.js';
import {
  objectDifferences,
  relationshipDifferences,
  typeDifferences,
} from './DraftChangeSummary.js';
import { relationshipDetails } from './relationship-description.js';
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
  const rows = [
    ...draft.changes.map((change) => ({
      ...change,
      key: `object-${change.id}`,
      name: change.after?.name ?? change.before?.name,
      type: change.type.name,
      differences: objectDifferences(change),
    })),
    ...(draft.relationships ?? []).map((change) => {
      const describe = (value: NonNullable<typeof change.after>) =>
        relationshipDetails(
          value,
          change.type.forwardLabel ?? change.type.name,
          change.objectNames,
        );
      const differences = relationshipDifferences(change);
      return {
        ...change,
        key: `relationship-${change.id}`,
        name: change.after
          ? describe(change.after)
          : change.before
            ? describe(change.before)
            : 'Samband',
        type: change.type.name,
        differences,
      };
    }),
    ...(
      [
        ['Objekttyp', draft.objectTypes],
        ['Sambandstyp', draft.relationshipTypes],
      ] as const
    ).flatMap(([type, changes]) =>
      (changes ?? []).map((change) => ({
        ...change,
        key: `${type}-${change.id}`,
        name: change.after?.name ?? change.before?.name,
        type,
        differences:
          change.before && change.after ? typeDifferences(change.before, change.after) : [],
      })),
    ),
  ];
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
