CREATE TABLE
  user_two_factor_device
(
  uuid           uuid         NOT NULL DEFAULT uuid_generate_v4(),
  user_uuid      uuid         NOT NULL REFERENCES "user" (uuid) ON DELETE CASCADE,
  device_name    VARCHAR(255) NOT NULL,
  secret         VARCHAR(255) NOT NULL,
  enabled        boolean      NOT NULL DEFAULT false,
  backup_codes   jsonb        NOT NULL DEFAULT '[]'::jsonb,
  date_created   timestamp    NOT NULL DEFAULT now(),
  date_updated   timestamp    NOT NULL DEFAULT now(),
  PRIMARY KEY (uuid)
);

CREATE INDEX user_two_factor_device_user_uuid_idx ON user_two_factor_device (user_uuid);
CREATE INDEX user_two_factor_device_enabled_idx ON user_two_factor_device (user_uuid, enabled) WHERE enabled = true;