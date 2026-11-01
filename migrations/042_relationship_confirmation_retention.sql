ALTER TABLE relationship_form_attempt ADD COLUMN expiresAt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE relationship_form_attempt ADD COLUMN fingerprint TEXT;
ALTER TABLE relationship_form_attempt ADD COLUMN accountedBytes INTEGER NOT NULL DEFAULT 0;
-- Charge retained evidence once; admission only sums the persisted accounting.
UPDATE relationship_form_attempt SET accountedBytes = 512
  + length(cast(householdId AS blob)) + length(cast(userId AS blob))
  + length(cast(stagingId AS blob)) + length(cast(submission AS blob))
  + length(cast(outcome AS blob)) + coalesce(length(fingerprint), 0);
-- One durable grace deadline, fixed by the upgrade transaction.
UPDATE relationship_form_attempt SET expiresAt = CAST(unixepoch('subsec') * 1000 AS INTEGER) + 604800000;
CREATE INDEX relationship_form_expiry ON relationship_form_attempt(expiresAt);
CREATE TABLE relationship_form_signing (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  secret TEXT NOT NULL
);
INSERT INTO relationship_form_signing VALUES (1, lower(hex(randomblob(32))));
CREATE INDEX relationship_form_legacy ON relationship_form_attempt(fingerprint) WHERE fingerprint IS NULL;
