CREATE TABLE
  "info"
(

  key_name       VARCHAR(50) PRIMARY KEY,
  key_value      TEXT        NOT NULL,
  modified_date  TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);
