CREATE TABLE
  "message"
(
    uuid                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
    status                  VARCHAR     NOT NULL DEFAULT 'DRAFT',
    props                   jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_by_user_uuid    uuid        NOT NULL,
    date_created            TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    date_modified           TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),

    CONSTRAINT message_created_by_user_fk FOREIGN KEY (created_by_user_uuid) REFERENCES "user" ("uuid")
);
