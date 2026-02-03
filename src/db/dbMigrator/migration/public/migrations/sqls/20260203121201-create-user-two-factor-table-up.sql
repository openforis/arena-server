CREATE TABLE
  user_two_factor
(
  user_uuid      uuid         NOT NULL REFERENCES "user" (uuid) ON DELETE CASCADE,
  secret         VARCHAR(255) NOT NULL,
  enabled        boolean      NOT NULL DEFAULT false,
  backup_codes   jsonb        NOT NULL DEFAULT '[]'::jsonb,
  date_created   timestamptz  NOT NULL DEFAULT now(),
  date_updated   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_uuid)
);

CREATE INDEX idx_user_two_factor_enabled ON user_two_factor (user_uuid, enabled) WHERE enabled = true;