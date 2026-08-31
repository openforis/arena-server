CREATE TABLE
  connected_socket
(
  socket_id     VARCHAR     NOT NULL,
  user_uuid     uuid        NOT NULL,
  connected_at  TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  last_seen_at  TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),

  PRIMARY KEY (socket_id),
  CONSTRAINT connected_socket_user_fk FOREIGN KEY (user_uuid) REFERENCES "user" ("uuid") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS connected_socket_user_uuid_idx ON connected_socket(user_uuid);
CREATE INDEX IF NOT EXISTS connected_socket_last_seen_at_idx ON connected_socket(last_seen_at);

CREATE TABLE
  ws_relay_message
(
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  payload       jsonb       NOT NULL,
  date_created  TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),

  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ws_relay_message_date_created_idx ON ws_relay_message(date_created);
