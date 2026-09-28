# arena-server

Arena node/express/Postgres service implementation

## Installation

The package is published on [npmjs](https://www.npmjs.com/package/@openforis/arena-server) (and also on GitHub Packages). No authentication or additional registry configuration is needed:

```shell
yarn add @openforis/arena-server
```

or

```shell
npm install @openforis/arena-server
```

> Its dependency `@openforis/arena-core` is also fetched from [npmjs](https://www.npmjs.com/package/@openforis/arena-core).

### Installing from GitHub Packages (optional)

To install from GitHub Packages instead, authenticate with a personal access token (scope `read:packages`) and map the scope to that registry in `.npmrc`:

```shell
@openforis:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=TOKEN
```

## Development

### Database

To install local database:

```shell script
sudo docker run -d --name arena-db -p 5444:5432 -e POSTGRES_DB=arena -e POSTGRES_PASSWORD=arena -e POSTGRES_USER=arena postgis/postgis:17-3.5
```

To restart local database:

```shell script
docker container restart arena-db
```

### .env file

The .env file is needed for development and locally running the stack.

It must be added to the root directory of the project and must match the template `.env.template`.

### Database migrations

Migrations are run automatically on server startup.

#### Adding a new database migration

When you need execute DDL or other update update logic (e.g. to add a new table to the database, `dbtable`), create a migration template with:

```shell
yarn dbmigrate:create --name=add-table-dbtable
```

Now you'll see new sql files in `src/db/dbMigrator/migration/<schema>/migrations/sql/<timestamp>-add-table-dbtable-<up/down>.sql`

You should edit the `<timestamp>-add-table-dbtable-up.sql` to contain your DDL statements.

You could also add the corresponding `drop table` to `<timestamp>-add-table-dbtable-down.sql` if you ever want to undo migrations.

By default, migrations are applied to the `public` schema; if you need to update the `survey` schema, pass `--schema=survey` as parameter. E.g.

```shell
yarn dbmigrate:create --name=add-table-to-survey-schema-db-table --schema=survey
```
