-- Index individual committed changes, not whole receipts. The source remains
-- the history/receipt join, including its ordering and missing-receipt fallback.
CREATE INDEX map_history_operation ON map_history(householdId, userId, operationId);

CREATE VIEW map_history_change_source AS
SELECT h.id AS historyId, h.householdId, h.userId, h.operationId,
  kinds.key AS kind, item.key AS ordinal,
  coalesce(json_extract(item.value, '$.id'),
    json_extract(item.value, '$.after.id'), json_extract(item.value, '$.before.id')) AS entityId,
  item.value AS change,
  json_extract(s.receipt, '$.actorName') AS actorName,
  json_extract(s.receipt, '$.savedAt') AS savedAt,
  (json_type(item.value, '$.before') = 'object'
    AND json_type(item.value, '$.after') = 'null') AS removed
FROM map_history h JOIN map_save s
  ON s.householdId = h.householdId AND s.userId = h.userId AND s.operationId = h.operationId
JOIN json_each(json_object(
  'object', json_extract(s.receipt, '$.changes'),
  'relationship', json_extract(s.receipt, '$.relationships'),
  'objectType', json_extract(s.receipt, '$.objectTypes'),
  'relationshipType', json_extract(s.receipt, '$.relationshipTypes'))) kinds
JOIN json_each(kinds.value) item;

CREATE TABLE map_history_change (
  historyId INTEGER NOT NULL REFERENCES map_history(id) ON DELETE CASCADE,
  householdId TEXT NOT NULL,
  userId TEXT NOT NULL,
  operationId TEXT NOT NULL,
  kind TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  entityId TEXT NOT NULL,
  change TEXT NOT NULL,
  actorName TEXT,
  savedAt TEXT NOT NULL,
  removed INTEGER,
  PRIMARY KEY(historyId, kind, ordinal),
  FOREIGN KEY(householdId, userId, operationId)
    REFERENCES map_save(householdId, userId, operationId) ON DELETE CASCADE
);
CREATE INDEX map_history_change_entity
  ON map_history_change(householdId, kind, entityId, historyId DESC, ordinal);
CREATE INDEX map_history_change_removed
  ON map_history_change(householdId, kind, entityId, historyId DESC, ordinal)
  WHERE removed = 1;
CREATE INDEX map_history_change_operation
  ON map_history_change(householdId, userId, operationId);

INSERT INTO map_history_change SELECT * FROM map_history_change_source;

-- Saves insert history before the receipt; import inserts receipts first.
-- Both orders populate the index in the same transaction as the source data.
CREATE TRIGGER map_history_change_insert AFTER INSERT ON map_history
BEGIN
  INSERT INTO map_history_change SELECT * FROM map_history_change_source
    WHERE historyId = NEW.id;
END;
CREATE TRIGGER map_save_change_insert AFTER INSERT ON map_save
BEGIN
  INSERT INTO map_history_change SELECT * FROM map_history_change_source
    WHERE householdId = NEW.householdId AND userId = NEW.userId AND operationId = NEW.operationId;
END;
-- Permanent erasure rewrites receipts. Rebuild only that receipt's entries so
-- removed values cannot survive in the derived index.
CREATE TRIGGER map_save_change_update AFTER UPDATE OF receipt ON map_save
BEGIN
  DELETE FROM map_history_change
    WHERE householdId = OLD.householdId AND userId = OLD.userId AND operationId = OLD.operationId;
  INSERT INTO map_history_change SELECT * FROM map_history_change_source
    WHERE householdId = NEW.householdId AND userId = NEW.userId AND operationId = NEW.operationId;
END;
