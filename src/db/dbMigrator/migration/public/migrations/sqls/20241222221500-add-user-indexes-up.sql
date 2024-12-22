CREATE INDEX user_access_request_modified_by_idx ON user_access_request(modified_by);

CREATE INDEX user_invitation_user_idx ON user_invitation(user_uuid);

CREATE INDEX user_invitation_invited_by_idx ON user_invitation(invited_by);

