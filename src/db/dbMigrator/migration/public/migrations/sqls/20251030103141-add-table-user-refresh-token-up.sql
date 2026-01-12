CREATE TABLE
  user_refresh_token
(
  uuid          uuid        NOT NULL DEFAULT uuid_generate_v4(),
  user_uuid     uuid        NOT NULL,
  props         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  date_created  TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  expires_at    TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  revoked       BOOLEAN     NOT NULL DEFAULT FALSE,

  PRIMARY KEY (uuid),
  CONSTRAINT user_refresh_token_user_fk FOREIGN KEY (user_uuid) REFERENCES "user" ("uuid") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_refresh_token_user_idx ON user_refresh_token(user_uuid);
