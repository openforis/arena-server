CREATE TABLE rate_limit_hit
(
    key      varchar   NOT NULL PRIMARY KEY,
    hits     integer   NOT NULL DEFAULT 0,
    reset_at timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_hit_reset_at_idx ON rate_limit_hit (reset_at);
