-- Private, immutable results of complete relationship-form submissions.
-- They never contribute proposals, save receipts or portable household content.
CREATE TABLE relationship_form_attempt (
  householdId TEXT NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  userId TEXT NOT NULL,
  contentVersion INTEGER NOT NULL,
  stagingId TEXT NOT NULL,
  submission TEXT NOT NULL,
  outcome TEXT NOT NULL,
  PRIMARY KEY(householdId, userId, contentVersion, stagingId),
  FOREIGN KEY(householdId, userId) REFERENCES content_identity(householdId, id) ON DELETE CASCADE
);
CREATE TRIGGER relationship_form_content_cleanup
AFTER UPDATE OF contentVersion ON household
WHEN NEW.contentVersion != OLD.contentVersion
BEGIN
  DELETE FROM relationship_form_attempt WHERE householdId = NEW.id;
END;
