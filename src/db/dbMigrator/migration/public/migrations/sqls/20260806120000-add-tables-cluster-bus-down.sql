DROP INDEX IF EXISTS ws_relay_message_date_created_idx;
DROP TABLE IF EXISTS ws_relay_message;

DROP INDEX IF EXISTS connected_socket_last_seen_at_idx;
DROP INDEX IF EXISTS connected_socket_user_uuid_idx;
DROP TABLE IF EXISTS connected_socket;
