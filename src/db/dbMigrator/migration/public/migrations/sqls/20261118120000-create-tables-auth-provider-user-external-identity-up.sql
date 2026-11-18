CREATE TABLE
  auth_provider
(
  id            varchar(64) NOT NULL,
  type          varchar(32) NOT NULL,
  props         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  client_secret text            NULL,
  icon_file     bytea           NULL,
  icon_mime     varchar(64)     NULL,
  date_created  timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  date_modified timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  CONSTRAINT auth_provider_pkey PRIMARY KEY (id)
);

CREATE TABLE
  user_external_identity
(
  id             bigserial    NOT NULL,
  user_uuid      uuid         NOT NULL,
  provider_id    varchar(64)  NOT NULL,
  issuer         text         NOT NULL,
  subject        text         NOT NULL,
  email          text             NULL,
  date_created   timestamp    NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  date_last_used timestamp        NULL,
  CONSTRAINT user_external_identity_pkey PRIMARY KEY (id),
  CONSTRAINT user_external_identity_user_fk FOREIGN KEY (user_uuid) REFERENCES "user" (uuid) ON DELETE CASCADE,
  CONSTRAINT user_external_identity_issuer_subject_uq UNIQUE (issuer, subject),
  CONSTRAINT user_external_identity_user_provider_uq UNIQUE (user_uuid, provider_id)
);

CREATE INDEX user_external_identity_provider_idx ON user_external_identity (provider_id);
