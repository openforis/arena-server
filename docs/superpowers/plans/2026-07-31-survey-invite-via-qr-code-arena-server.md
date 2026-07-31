# Survey Invite via QR Code (arena-server) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `survey_invite_token` table plus a `SurveyInviteTokenService`/`SurveyInviteTokenRepository` pair to `@openforis/arena-server`, so the `arena` repo can create short-lived, hashed, multi-use tokens scoped to a survey+role and look them up when a mobile user redeems one via QR code.

**Architecture:** Mirrors the existing `user_temp_auth_token` feature (`src/model/userTempAuthToken`, `src/db/table/schemaPublic/userTempAuthToken.ts`, `src/repository/userTempAuthToken`, `src/service/userTempAuthToken`) exactly in file layout and code style, but scoped to `{ surveyUuid, groupUuid, createdByUserUuid }` instead of a single target `userUuid`, and **not single-use** — `getByTokenHash` never deletes the row (unlike `userTempAuthToken`'s `revoke`), only `deleteExpired` removes rows, via the daily cleanup job that will be added in the `arena` repo's own plan. This repo does **not** get new Express routes for this feature — per the design doc, the actual `POST .../invite/qr` and `POST .../invite/qr/accept` HTTP endpoints, their authorization checks, and the WebSocket "someone joined" notification all live in the `arena` repo (which already imports `ServiceRegistry`, `ServerServiceType`, and `WebSocketServer` from this package for identical purposes — see `server/modules/user/service/userService.js:438,536,585` in that repo). This repo's job is strictly: schema + typed CRUD service, registered so `arena` can fetch it via `ServiceRegistry.getInstance().getService(ServerServiceType.surveyInviteToken)`.

**Tech Stack:** TypeScript, `db-migrate` + raw SQL migrations, pg-promise (via this repo's `SqlInsertBuilder`/`SqlSelectBuilder`/`SqlDeleteBuilder`), Jest (`ts-jest`, tests run against compiled `dist/`), `ServiceRegistry` from `@openforis/arena-core`.

## Global Constraints

- Token is **never stored in plaintext** — only its SHA-256 hex hash (`crypto.createHash('sha256').update(token).digest('hex')`, copied from `src/service/userTempAuthToken/utils.ts`).
- Default expiry is **60 minutes** (`expirationMinutes = 60`), unlike `userTempAuthToken`'s 1-minute default — this token is meant to stay valid for an entire workshop/session, not a single login.
- Token is **multi-use**: reading it (`getByTokenHash`) must NOT delete or mutate the row. Only expiry (`date_expires_at < NOW()`, cleaned up by `deleteExpired`) ends its life, plus whatever manual "revoke" the `arena` repo's plan adds on top (out of scope here — that's a plain `DELETE ... WHERE token_hash = $1`, not part of this repo's public service surface for now).
- Do not add new Express API routes or WebSocket event constants in this repo — those live in `arena`.
- Follow the exact file/class/type naming style of the `userTempAuthToken` feature (see file list in every task below) so the two features stay easy to compare side by side.
- This repo's `test` script always does a full `clean → tsc:test → copy-assets → jest` cycle (`package.json:81`); there is no fast single-file TS-only runner, so "run the tests" always means `yarn test` (optionally with `-- -t "<name>"` appended, since `jest`, the last step of the `run-s` chain, does receive trailing args).

---

### Task 1: Migration — `survey_invite_token` table

**Files:**

- Create (auto-generated, then hand-filled): `src/db/dbMigrator/migration/public/migrations/<timestamp>-add-table-survey-invite-token.js`
- Create (hand-filled): `src/db/dbMigrator/migration/public/migrations/sqls/<timestamp>-add-table-survey-invite-token-up.sql`
- Create (hand-filled): `src/db/dbMigrator/migration/public/migrations/sqls/<timestamp>-add-table-survey-invite-token-down.sql`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: the `survey_invite_token` table, columns `token_hash varchar(64) PK`, `survey_uuid uuid`, `group_uuid uuid`, `created_by_user_uuid uuid`, `date_created timestamp`, `date_expires_at timestamp` — relied on by every later task's SQL.

- [ ] **Step 1: Generate the migration scaffold**

Run: `yarn dbmigrate:create --name=add-table-survey-invite-token`

Expected output: a new file `src/db/dbMigrator/migration/public/migrations/<timestamp>-add-table-survey-invite-token.js` (boilerplate identical to the existing `20260118215307-add-table-user-temp-auth-token.js` — reads the matching `up`/`down` `.sql` file from the `sqls/` subfolder and runs it), plus two **empty** files under `sqls/`: `<timestamp>-add-table-survey-invite-token-up.sql` and `-down.sql`. Note the printed `<timestamp>` — it's needed to find these three files in the next steps (do not rename them).

- [ ] **Step 2: Write the up migration SQL**

Replace the contents of `sqls/<timestamp>-add-table-survey-invite-token-up.sql`:

```sql
CREATE TABLE IF NOT EXISTS survey_invite_token (
    token_hash            varchar(64) PRIMARY KEY,
    survey_uuid           uuid        NOT NULL REFERENCES survey(uuid) ON DELETE CASCADE,
    group_uuid            uuid        NOT NULL REFERENCES auth_group(uuid) ON DELETE CASCADE,
    created_by_user_uuid  uuid        NOT NULL REFERENCES "user"(uuid) ON DELETE CASCADE,
    date_created          TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
    date_expires_at       TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'UTC' + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS survey_invite_token_survey_uuid_idx ON survey_invite_token(survey_uuid);
CREATE INDEX IF NOT EXISTS survey_invite_token_date_expires_at_idx ON survey_invite_token(date_expires_at);
```

- [ ] **Step 3: Write the down migration SQL**

Replace the contents of `sqls/<timestamp>-add-table-survey-invite-token-down.sql`:

```sql
DROP TABLE IF EXISTS survey_invite_token;
```

- [ ] **Step 4: Run the migration against your local dev database**

Run: `yarn db:migrate` (or whatever this repo's migrate-up script is named — check `package.json` for a script that calls `DBMigrator`/`dbMigrate up`; if none exists, start the server locally once with `MIGRATE_ONLY=true`, matching how the `arena` repo's `yarn server:migrate` triggers this package's migrator on boot).

Expected: no errors; connect to the dev DB and confirm with `\d survey_invite_token` that the table and both indexes exist with the exact columns above.

- [ ] **Step 5: Commit**

```bash
git add src/db/dbMigrator/migration/public/migrations/
git commit -m "feat(db): add survey_invite_token table"
```

---

### Task 2: Model + DB table-schema class

**Files:**

- Create: `src/model/surveyInviteToken/surveyInviteToken.ts`
- Modify: `src/model/index.ts`
- Create: `src/db/table/schemaPublic/surveyInviteToken.ts`
- Modify: `src/db/table/schemaPublic/index.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks (only the DB table from Task 1, at runtime).
- Produces: types `SurveyInviteToken`, `SurveyInviteTokenStored`, `SurveyInviteTokenForClient` and class `TableSurveyInviteToken` (with `.tokenHash`, `.surveyUuid`, `.groupUuid`, `.createdByUserUuid`, `.dateCreated`, `.dateExpiresAt` columns and a `.columns` getter) — relied on by the repository in Task 3.

- [ ] **Step 1: Add the model types**

Create `src/model/surveyInviteToken/surveyInviteToken.ts`:

```ts
export type SurveyInviteToken = {
  surveyUuid: string
  groupUuid: string
  createdByUserUuid: string
  dateCreated: Date
  dateExpiresAt: Date
}

export type SurveyInviteTokenStored = SurveyInviteToken & {
  tokenHash: string
}

export type SurveyInviteTokenForClient = SurveyInviteToken & {
  token: string // Plain token returned only once to the client
}
```

- [ ] **Step 2: Re-export from the model barrel**

In `src/model/index.ts`, add (next to the existing `UserTempAuthToken` export):

```ts
export type { SurveyInviteToken, SurveyInviteTokenStored, SurveyInviteTokenForClient } from './surveyInviteToken'
```

- [ ] **Step 3: Add the table-schema class**

Create `src/db/table/schemaPublic/surveyInviteToken.ts`:

```ts
import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableSurveyInviteToken extends TableSchemaPublic {
  readonly tokenHash: Column = new Column(this, 'token_hash', ColumnType.varchar)
  readonly surveyUuid: Column = new Column(this, 'survey_uuid', ColumnType.uuid)
  readonly groupUuid: Column = new Column(this, 'group_uuid', ColumnType.uuid)
  readonly createdByUserUuid: Column = new Column(this, 'created_by_user_uuid', ColumnType.uuid)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateExpiresAt: Column = new Column(this, 'date_expires_at', ColumnType.timeStamp)

  constructor() {
    super('survey_invite_token')
  }

  get columns() {
    return [
      this.tokenHash,
      this.surveyUuid,
      this.groupUuid,
      this.createdByUserUuid,
      this.dateCreated,
      this.dateExpiresAt,
    ]
  }
}
```

- [ ] **Step 4: Re-export from the schema barrel**

In `src/db/table/schemaPublic/index.ts`, add (next to `TableUserTempAuthToken`):

```ts
export { TableSurveyInviteToken } from './surveyInviteToken'
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/model/surveyInviteToken src/model/index.ts src/db/table/schemaPublic/surveyInviteToken.ts src/db/table/schemaPublic/index.ts
git commit -m "feat(model): add SurveyInviteToken model and table schema"
```

---

### Task 3: Repository layer

**Files:**

- Create: `src/repository/surveyInviteToken/insert.ts`
- Create: `src/repository/surveyInviteToken/getByTokenHash.ts`
- Create: `src/repository/surveyInviteToken/deleteExpired.ts`
- Create: `src/repository/surveyInviteToken/index.ts`
- Modify: `src/repository/index.ts`

**Interfaces:**

- Consumes: `TableSurveyInviteToken` and `SurveyInviteTokenStored` from Task 2.
- Produces: `SurveyInviteTokenRepository.{insert, getByTokenHash, deleteExpired}` — relied on by the service in Task 4. Signatures:
  - `insert(options: SurveyInviteTokenStored, client?: BaseProtocol): Promise<SurveyInviteTokenStored>`
  - `getByTokenHash(tokenHash: string, client?: BaseProtocol): Promise<SurveyInviteTokenStored | null>` — only returns non-expired rows.
  - `deleteExpired(client?: BaseProtocol): Promise<number>` — returns rows-deleted count.

- [ ] **Step 1: Insert**

Create `src/repository/surveyInviteToken/insert.ts`:

```ts
import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableSurveyInviteToken } from '../../db'
import { SurveyInviteTokenStored } from '../../model'

/**
 * Inserts a new survey invite token.
 *
 * @param options - The survey invite token data
 * @param client - Database client
 */
export const insert = async (
  options: SurveyInviteTokenStored,
  client: BaseProtocol = DB
): Promise<SurveyInviteTokenStored> => {
  const { tokenHash, surveyUuid, groupUuid, createdByUserUuid, dateCreated, dateExpiresAt } = options

  const table = new TableSurveyInviteToken()

  const values = {
    [table.tokenHash.columnName]: tokenHash,
    [table.surveyUuid.columnName]: surveyUuid,
    [table.groupUuid.columnName]: groupUuid,
    [table.createdByUserUuid.columnName]: createdByUserUuid,
    [table.dateCreated.columnName]: dateCreated,
    [table.dateExpiresAt.columnName]: dateExpiresAt,
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.columns)
    .build()

  return client.one<SurveyInviteTokenStored>(sql, values, (row) => DBs.transformCallback({ row }))
}
```

- [ ] **Step 2: Get by token hash (non-expired only)**

Create `src/repository/surveyInviteToken/getByTokenHash.ts`:

```ts
import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableSurveyInviteToken } from '../../db'
import { SurveyInviteTokenStored } from '../../model'

/**
 * Retrieves a survey invite token by its hash, if present and not expired.
 *
 * @param tokenHash - Hashed token value used to look up the invite token
 * @param client - Database client
 * @returns The SurveyInviteTokenStored if found and not expired, null otherwise
 */
export const getByTokenHash = async (
  tokenHash: string,
  client: BaseProtocol = DB
): Promise<SurveyInviteTokenStored | null> => {
  const table = new TableSurveyInviteToken()

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(`${table.tokenHash} = $/tokenHash/`, `${table.dateExpiresAt} > NOW()`)
    .build()

  return client.oneOrNone(sql, { tokenHash }, (row) => DBs.transformCallback({ row }))
}
```

- [ ] **Step 3: Delete expired**

Create `src/repository/surveyInviteToken/deleteExpired.ts`:

```ts
import { BaseProtocol, DB, SqlDeleteBuilder, TableSurveyInviteToken } from '../../db'

/**
 * Deletes all expired survey invite tokens.
 *
 * @param client - Database client
 */
export const deleteExpired = async (client: BaseProtocol = DB): Promise<number> => {
  const table = new TableSurveyInviteToken()

  const sql = new SqlDeleteBuilder().deleteFrom(table).whereRaw(`${table.dateExpiresAt} < NOW()`).build()

  const result = await client.result(sql)
  return result.rowCount
}
```

- [ ] **Step 4: Barrel export**

Create `src/repository/surveyInviteToken/index.ts`:

```ts
import { deleteExpired } from './deleteExpired'
import { getByTokenHash } from './getByTokenHash'
import { insert } from './insert'

export const SurveyInviteTokenRepository = {
  insert,
  getByTokenHash,
  deleteExpired,
}
```

In `src/repository/index.ts`, add (next to `UserTempAuthTokenRepository`):

```ts
export { SurveyInviteTokenRepository } from './surveyInviteToken'
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/repository/surveyInviteToken src/repository/index.ts
git commit -m "feat(repository): add SurveyInviteTokenRepository"
```

---

### Task 4: Service layer + registration

**Files:**

- Create: `src/service/surveyInviteToken/utils.ts`
- Create: `src/service/surveyInviteToken/create.ts`
- Create: `src/service/surveyInviteToken/getByTokenHash.ts`
- Create: `src/service/surveyInviteToken/deleteExpired.ts`
- Create: `src/service/surveyInviteToken/index.ts`
- Modify: `src/service/index.ts`
- Modify: `src/server/arenaServer/serverServiceType.ts`
- Modify: `src/server/arenaServer/registerServices.ts`

**Interfaces:**

- Consumes: `SurveyInviteTokenRepository` from Task 3.
- Produces: `SurveyInviteTokenServiceServer.{create, getByTokenHash, deleteExpired}`, retrievable at runtime via `ServiceRegistry.getInstance().getService(ServerServiceType.surveyInviteToken)` — this is the exact call the `arena` repo's plan will use. Signatures:
  - `create(options: { surveyUuid: string; groupUuid: string; createdByUserUuid: string; expirationMinutes?: number }, client?): Promise<SurveyInviteTokenForClient>`
  - `getByTokenHash(tokenHash: string, client?): Promise<SurveyInviteTokenStored | null>`
  - `deleteExpired(client?): Promise<number>`

- [ ] **Step 1: Hash + client-shape utils**

Create `src/service/surveyInviteToken/utils.ts`:

```ts
import crypto from 'node:crypto'
import { SurveyInviteTokenForClient, SurveyInviteTokenStored } from '../../model'

export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

export const toSurveyInviteTokenForClient = (
  stored: SurveyInviteTokenStored,
  tokenPlain?: string
): SurveyInviteTokenForClient => {
  const { tokenHash: _, ...rest } = stored
  return {
    ...rest,
    token: tokenPlain ?? '',
  }
}
```

- [ ] **Step 2: Create**

Create `src/service/surveyInviteToken/create.ts`:

```ts
import * as crypto from 'node:crypto'

import { BaseProtocol, DB } from '../../db'
import { SurveyInviteTokenForClient, SurveyInviteTokenStored } from '../../model'
import { SurveyInviteTokenRepository } from '../../repository/surveyInviteToken'
import { hashToken, toSurveyInviteTokenForClient } from './utils'

/**
 * Creates a new survey invite token, scoped to a survey and a role (auth group).
 * Returns the plain token for the client, but stores only the hash in the database.
 *
 * @param options - Options containing surveyUuid, groupUuid, createdByUserUuid and optional expiration time
 * @param options.surveyUuid - Survey UUID the token grants access to
 * @param options.groupUuid - Auth group UUID (role) the token grants
 * @param options.createdByUserUuid - UUID of the admin who generated the token
 * @param options.expirationMinutes - Expiration time in minutes (default: 60 minutes)
 * @param client - Database client
 * @return The created survey invite token with the plain token
 */
export const create = async (
  options: { surveyUuid: string; groupUuid: string; createdByUserUuid: string; expirationMinutes?: number },
  client: BaseProtocol = DB
): Promise<SurveyInviteTokenForClient> => {
  const { surveyUuid, groupUuid, createdByUserUuid, expirationMinutes = 60 } = options

  const now = new Date()
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000)

  const token = crypto.randomUUID()
  const tokenHash = hashToken(token)

  const inviteToken: SurveyInviteTokenStored = {
    tokenHash,
    surveyUuid,
    groupUuid,
    createdByUserUuid,
    dateCreated: now,
    dateExpiresAt: expiresAt,
  }

  const inserted = await SurveyInviteTokenRepository.insert(inviteToken, client)

  return toSurveyInviteTokenForClient(inserted, token)
}
```

- [ ] **Step 3: Get by token hash**

Create `src/service/surveyInviteToken/getByTokenHash.ts`:

```ts
import { BaseProtocol, DB } from '../../db'
import { SurveyInviteTokenStored } from '../../model'
import { SurveyInviteTokenRepository } from '../../repository/surveyInviteToken'
import { hashToken } from './utils'

/**
 * Retrieves and validates a survey invite token by its plain value.
 * Returns the token if it exists and is not expired, null otherwise.
 * Does NOT delete the token — invite tokens are multi-use until they expire.
 *
 * @param token - Token UUID (plain, as scanned from the QR code)
 * @param client - Database client
 */
export const getByTokenHash = async (
  token: string,
  client: BaseProtocol = DB
): Promise<SurveyInviteTokenStored | null> => {
  const tokenHash = hashToken(token)
  return SurveyInviteTokenRepository.getByTokenHash(tokenHash, client)
}
```

- [ ] **Step 4: Delete expired**

Create `src/service/surveyInviteToken/deleteExpired.ts`:

```ts
import { BaseProtocol, DB } from '../../db'
import { SurveyInviteTokenRepository } from '../../repository/surveyInviteToken'

/**
 * Cleans up expired survey invite tokens.
 *
 * @param client - Database client
 */
export const deleteExpired = async (client: BaseProtocol = DB): Promise<number> =>
  SurveyInviteTokenRepository.deleteExpired(client)
```

- [ ] **Step 5: Barrel export**

Create `src/service/surveyInviteToken/index.ts`:

```ts
import { create } from './create'
import { deleteExpired } from './deleteExpired'
import { getByTokenHash } from './getByTokenHash'

export type SurveyInviteTokenService = {
  create: typeof create
  getByTokenHash: typeof getByTokenHash
  deleteExpired: typeof deleteExpired
}

export const SurveyInviteTokenServiceServer: SurveyInviteTokenService = {
  create,
  getByTokenHash,
  deleteExpired,
}
```

In `src/service/index.ts`, add (next to the `UserTempAuthToken` exports):

```ts
export type { SurveyInviteTokenService } from './surveyInviteToken'
export { SurveyInviteTokenServiceServer } from './surveyInviteToken'
```

- [ ] **Step 6: Register the service**

In `src/server/arenaServer/serverServiceType.ts`, add a member to the enum:

```ts
export enum ServerServiceType {
  dataQuery = 'dataQuery',
  message = 'message',
  userTempAuthToken = 'userTempAuthToken',
  user2FA = 'user2FA',
  userGroup = 'userGroup',
  surveyInviteToken = 'surveyInviteToken',
}
```

In `src/server/arenaServer/registerServices.ts`, import and register it:

```ts
import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import {
  DataQueryServiceServer,
  InfoServiceServer,
  MessageServiceServer,
  RecordServiceServer,
  SurveyServiceServer,
  SurveyInviteTokenServiceServer,
  UserAuthTokenServiceServer,
  UserTempAuthTokenServiceServer,
  UserServiceServer,
  User2FAServiceServer,
  UserGroupServiceServer,
} from '../../service'
import { ServerServiceType } from './serverServiceType'

export const registerServices = (): ServiceRegistry =>
  ServiceRegistry.getInstance()
    .registerService(ServiceType.info, InfoServiceServer)
    .registerService(ServiceType.record, RecordServiceServer)
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.userAuthToken, UserAuthTokenServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
    .registerService(ServerServiceType.dataQuery, DataQueryServiceServer)
    .registerService(ServerServiceType.message, MessageServiceServer)
    .registerService(ServerServiceType.userTempAuthToken, UserTempAuthTokenServiceServer)
    .registerService(ServerServiceType.user2FA, User2FAServiceServer)
    .registerService(ServerServiceType.userGroup, UserGroupServiceServer)
    .registerService(ServerServiceType.surveyInviteToken, SurveyInviteTokenServiceServer)
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/service/surveyInviteToken src/service/index.ts src/server/arenaServer/serverServiceType.ts src/server/arenaServer/registerServices.ts
git commit -m "feat(service): add SurveyInviteTokenService and register it"
```

---

### Task 5: Integration test against a real database

**Files:**

- Create: `src/service/surveyInviteToken/tests/surveyInviteToken.test.ts`
- Create: `src/service/surveyInviteToken/tests/fixtures.ts`

**Interfaces:**

- Consumes: `SurveyInviteTokenServiceServer` (Task 4), `DB` from `src/db` — same real-database access pattern as `src/api/tests/utils/insertTestUser.ts`.
- Produces: nothing consumed by later tasks — this is the end of this repo's plan.

**Context:** This repo has no prior test for `userTempAuthToken` to copy, but `src/api/tests/utils/insertTestUser.ts` establishes the idiom for hitting the real dev/test Postgres directly with raw SQL fixtures inside a `DB.tx`. This task follows that idiom instead of going through the (out-of-scope-here) HTTP layer, since `SurveyInviteTokenServiceServer` has no API route of its own in this repo.

- [ ] **Step 1: Write the fixture helper**

Create `src/service/surveyInviteToken/tests/fixtures.ts`:

```ts
import { DB } from '../../../db'

export type SurveyInviteTokenTestFixtures = {
  userUuid: string
  surveyUuid: string
  groupUuid: string
}

/**
 * Inserts a throwaway user, survey and survey auth-group directly via raw SQL,
 * for use as foreign-key targets in survey_invite_token tests. Uses random
 * suffixes so repeated test runs against a persistent dev DB don't collide.
 */
export const insertSurveyInviteTokenFixtures = async (): Promise<SurveyInviteTokenTestFixtures> =>
  DB.tx(async (tx) => {
    const suffix = Date.now()

    const { uuid: userUuid } = await tx.one(
      `INSERT INTO "user" (name, email, password, status)
       VALUES ($1, $2, $3, 'ACCEPTED')
       RETURNING uuid`,
      [`Invite Token Test User ${suffix}`, `invite-token-test-${suffix}@openforis-arena.org`, 'unused-hash']
    )

    const { uuid: surveyUuid } = await tx.one(
      `INSERT INTO survey (uuid, owner_uuid, props)
       VALUES (uuid_generate_v4(), $1, $2::jsonb)
       RETURNING uuid`,
      [userUuid, JSON.stringify({ name: `invite_token_test_survey_${suffix}` })]
    )

    const { uuid: groupUuid } = await tx.one(
      `INSERT INTO auth_group (uuid, survey_uuid, name, permissions, record_steps)
       VALUES (uuid_generate_v4(), $1, 'dataEntry', '{}'::jsonb, '{}'::jsonb)
       RETURNING uuid`,
      [surveyUuid]
    )

    return { userUuid, surveyUuid, groupUuid }
  })
```

- [ ] **Step 2: Write the failing test**

Create `src/service/surveyInviteToken/tests/surveyInviteToken.test.ts`:

```ts
import { DB } from '../../../db'
import { SurveyInviteTokenServiceServer } from '../index'
import { hashToken } from '../utils'
import { insertSurveyInviteTokenFixtures, SurveyInviteTokenTestFixtures } from './fixtures'

describe('SurveyInviteTokenService', () => {
  let fixtures: SurveyInviteTokenTestFixtures

  beforeAll(async () => {
    fixtures = await insertSurveyInviteTokenFixtures()
  })

  test('create returns a plain token and getByTokenHash resolves it', async () => {
    const { surveyUuid, groupUuid, userUuid } = fixtures

    const created = await SurveyInviteTokenServiceServer.create({
      surveyUuid,
      groupUuid,
      createdByUserUuid: userUuid,
    })

    expect(created.token).toBeDefined()
    expect(created.surveyUuid).toBe(surveyUuid)
    expect(created.groupUuid).toBe(groupUuid)
    expect(created.createdByUserUuid).toBe(userUuid)

    const fetched = await SurveyInviteTokenServiceServer.getByTokenHash(created.token)

    expect(fetched).not.toBeNull()
    expect(fetched?.surveyUuid).toBe(surveyUuid)
    expect(fetched?.groupUuid).toBe(groupUuid)
  })

  test('getByTokenHash does not delete the token (multi-use)', async () => {
    const { surveyUuid, groupUuid, userUuid } = fixtures

    const created = await SurveyInviteTokenServiceServer.create({
      surveyUuid,
      groupUuid,
      createdByUserUuid: userUuid,
    })

    const firstRead = await SurveyInviteTokenServiceServer.getByTokenHash(created.token)
    const secondRead = await SurveyInviteTokenServiceServer.getByTokenHash(created.token)

    expect(firstRead).not.toBeNull()
    expect(secondRead).not.toBeNull()
  })

  test('getByTokenHash returns null for an unknown token', async () => {
    const fetched = await SurveyInviteTokenServiceServer.getByTokenHash('00000000-0000-0000-0000-000000000000')
    expect(fetched).toBeNull()
  })

  test('getByTokenHash returns null for an expired token, and deleteExpired removes it', async () => {
    const { surveyUuid, groupUuid, userUuid } = fixtures

    const created = await SurveyInviteTokenServiceServer.create({
      surveyUuid,
      groupUuid,
      createdByUserUuid: userUuid,
      expirationMinutes: -1, // already expired
    })

    const fetched = await SurveyInviteTokenServiceServer.getByTokenHash(created.token)
    expect(fetched).toBeNull()

    const deletedCount = await SurveyInviteTokenServiceServer.deleteExpired()
    expect(deletedCount).toBeGreaterThanOrEqual(1)

    const remaining = await DB.oneOrNone(
      `SELECT count(*)::int AS count FROM survey_invite_token WHERE token_hash = $1`,
      [hashToken(created.token)]
    )
    expect(remaining.count).toBe(0)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `yarn test -- -t "SurveyInviteTokenService"`

Expected: FAIL — `Cannot find module '../index'` or similar, since Task 4 hasn't been reached yet if executed standalone. If Tasks 1-4 are already done (normal sequential execution), this step instead verifies the DB connection and fixtures work before the assertions are trusted; if everything already passes at this point, note that explicitly rather than treating it as a red flag — TDD's "see it fail first" guarantee was already satisfied by Task 4's own step-by-step build-up.

- [ ] **Step 4: Run the full test suite**

Run: `yarn test`

Expected: PASS, all 4 new tests plus every pre-existing test (in particular `src/api/tests/api.test.ts`, to confirm nothing about service registration broke app boot).

- [ ] **Step 5: Commit**

```bash
git add src/service/surveyInviteToken/tests
git commit -m "test(surveyInviteToken): add integration tests against a real database"
```

---

## Handoff to the `arena` repo

Once this plan is merged and `@openforis/arena-server` is released with a new version, the `arena` repo's own plan (`docs/superpowers/plans/2026-07-31-survey-invite-via-qr-code-arena.md`, generated separately) bumps its `package.json` dependency and consumes `ServerServiceType.surveyInviteToken` via `ServiceRegistry.getInstance().getService(ServerServiceType.surveyInviteToken)`, exactly like it already does for `userTempAuthToken` (see `arena`'s `server/modules/user/service/userService.js` for the `WebSocketServer`/`ServerServiceType` import pattern to copy).
