CREATE TYPE user_access_request_status AS ENUM ('CREATED', 'ACCEPTED', 'REJECTED');

CREATE TABLE
  "user_access_request"
(
  uuid            uuid                  NOT NULL DEFAULT uuid_generate_v4(),
  email           VARCHAR               NOT NULL,
  props           jsonb                 NOT NULL DEFAULT '{}'::jsonb,
  status          user_access_request_status    NOT NULL DEFAULT 'CREATED',
  date_created    TIMESTAMP             NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  date_modified   TIMESTAMP             NULL,
  modified_by     uuid                  NULL,

  PRIMARY KEY ("uuid"),
  CONSTRAINT user_access_request_email_idx UNIQUE ("email"),
  CONSTRAINT user_access_request_modified_by_fk FOREIGN KEY (modified_by) REFERENCES "user" ("uuid") ON DELETE CASCADE
);
