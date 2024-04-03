CREATE TABLE
  data_query
(
  id                   bigint    NOT NULL GENERATED ALWAYS AS IDENTITY,
  uuid                 uuid      NOT NULL DEFAULT uuid_generate_v4(),

  props                jsonb     NOT NULL DEFAULT '{}'::jsonb,
  content              jsonb     NOT NULL DEFAULT '{}'::jsonb,

  date_created         TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  date_modified        TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),

  PRIMARY KEY (id)
);