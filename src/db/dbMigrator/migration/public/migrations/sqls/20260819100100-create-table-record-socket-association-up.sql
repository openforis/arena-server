CREATE TABLE
  record_socket_association
(
  record_uuid   uuid        NOT NULL,
  socket_id     VARCHAR     NOT NULL,
  date_created  TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),

  PRIMARY KEY (record_uuid, socket_id),
  CONSTRAINT record_socket_association_socket_fk FOREIGN KEY (socket_id) REFERENCES connected_socket ("socket_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS record_socket_association_record_uuid_idx ON record_socket_association(record_uuid);
CREATE INDEX IF NOT EXISTS record_socket_association_socket_id_idx ON record_socket_association(socket_id);
