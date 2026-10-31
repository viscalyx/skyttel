ALTER TABLE session ADD COLUMN loginProvider TEXT;
ALTER TABLE session ADD COLUMN loginSubject TEXT;

CREATE TABLE installation_recovery (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  generation TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('google', 'microsoft')),
  subject TEXT NOT NULL,
  completedAt TEXT
);
