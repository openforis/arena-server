# arena-server

Arena node/express/Postgres service implementation

## Installation

### 1. Authentication

You must use a personal access token with the appropriate scopes to install the package from GitHub Packages.

You can authenticate to GitHub Packages with npm by either editing your per-user ~/.npmrc file to include your personal access token or by logging in to npm on the command line using your username and personal access token.

To authenticate by adding your personal access token to your ~/.npmrc file, edit the ~/.npmrc file for your project to include the following line, replacing TOKEN with your personal access token. Create a new ~/.npmrc file if one doesn't exist.

```shell
//npm.pkg.github.com/:_authToken=TOKEN
```

To authenticate by logging in to npm, use the npm login command, replacing USERNAME with your GitHub username, TOKEN with your personal access token, and PUBLIC-EMAIL-ADDRESS with your email address.

If GitHub Packages is not your default package registry for using npm and you want to use the npm audit command, we recommend you use the --scope flag with the owner of the package when you authenticate to GitHub Packages.

```shell
$ npm login --scope=@OWNER --registry=https://npm.pkg.github.com

> Username: USERNAME
> Password: TOKEN
> Email: PUBLIC-EMAIL-ADDRESS
```

> For more information see [Authenticating to GitHub Packages](https://docs.github.com/en/packages/guides/configuring-npm-for-use-with-github-packages#authenticating-to-github-packages)

### 2. .npmrc

Create a new .npmrc file if one doesn't exist and add:

```shell
@openforis:registry=https://npm.pkg.github.com
always-auth = true
```

### 3. .yarnrc

Create a new .yarnrc file if one doesn't exist and add:

```shell
"@openforis:registry" "https://npm.pkg.github.com"
```

### 4. Add the package

```shell
yarn add @openforis/arena-server
```

or

```shell
npm install @openforis/arena-server
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

### DOCX to PDF conversion runtime notes

The DOCX to PDF helper uses `mammoth` + `puppeteer` at runtime. This has deployment implications:

- Installing `puppeteer` runs a postinstall step that downloads a Chromium build.
- Install time and artifact size increase significantly compared with typical Node.js dependencies.
- In restricted CI/CD or production networks, browser download can fail unless proxy/mirror settings are configured.

#### Linux runtime requirements

When using bundled Chromium, make sure your runtime image/host includes common Chromium libraries.
Typical Debian/Ubuntu packages include:

```shell
sudo apt-get update && sudo apt-get install -y \
	ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0 libatk1.0-0 \
	libc6 libcairo2 libcups2t64 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 \
	libglib2.0-0 libgtk-3-0t64 libnspr4 libnss3 libpango-1.0-0 libx11-6 \
	libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 \
	xdg-utils
```

If your distro enforces sandbox restrictions (for example Ubuntu with AppArmor userns restrictions), you may need to configure the host sandbox appropriately. As a last resort, set:

```shell
PUPPETEER_NO_SANDBOX=true
```

This is less secure and should be used only in trusted environments.

#### Cache, proxies, and download controls

Useful environment variables:

- `PUPPETEER_CACHE_DIR`: where Chromium binaries are cached.
- `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`: proxy configuration for download/runtime network.
- `PUPPETEER_SKIP_DOWNLOAD=true`: skip bundled Chromium download (requires a system Chromium + executable path).
- `PUPPETEER_EXECUTABLE_PATH`: path to a managed system Chromium/Chrome executable.

#### Concurrency control

DOCX to PDF conversion is CPU/memory intensive. The converter uses an internal queue with bounded concurrency.
Tune it with:

```shell
DOCX_PDF_MAX_CONCURRENCY=2
```

#### Should you use puppeteer-core instead?

- Use `puppeteer` when you want dependency-managed Chromium and simpler setup.
- Use `puppeteer-core` when production images already provide Chromium/Chrome and you want smaller/faster installs.
- If you switch to `puppeteer-core`, make `PUPPETEER_EXECUTABLE_PATH` (or an equivalent app-specific env var) mandatory in deployment.
