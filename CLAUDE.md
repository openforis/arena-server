# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arena Server is a Node.js/Express/PostgreSQL backend service library for the OpenForis Arena platform. It's published as an npm package (`@openforis/arena-server`) and provides a complete server infrastructure including database management, API endpoints, authentication, WebSocket support, and background job processing.

## Development Commands

### Build and Compilation

- `npm run build` - Full build (compile TypeScript + copy SQL assets)
- `npm run tsc` - Compile TypeScript only
- `npm run tsc:watch` - Watch mode for TypeScript compilation
- `npm run clean` - Remove dist directory and cache

### Testing

- `npm test` - Full test suite (clean, compile test config, copy assets, run Jest)
- `npm run test:watch` - Run tests in watch mode
- `npm run jest` - Run Jest directly (requires prior build)
- Tests are located in `src/**/tests/` directories
- Jest config runs tests from `dist/` directory (compiled code)

### Code Quality

- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- Husky pre-commit hooks run lint-staged (ESLint + Prettier on staged files)

### Database Migrations

- `npm run dbmigrate:create -- --name=migration-name` - Create new migration for `public` schema
- `npm run dbmigrate:create -- --name=migration-name --schema=survey` - Create migration for `survey` schema
- Migrations run automatically on server startup (unless `DISABLE_DB_MIGRATIONS=true`)
- Migration files: `src/db/dbMigrator/migration/{schema}/migrations/sql/`

## Architecture

### Core Components

**ArenaServer** (`src/server/arenaServer/`)

- Entry point for initializing and starting the server
- `ArenaServer.init()` - Registers services, runs migrations, initializes Express app
- `ArenaServer.start()` - Starts HTTP server
- `ArenaServer.stop()` - Gracefully stops server
- Middleware chain: HTTPS → JSON parsing → file upload → compression → headers → session → authentication → API routes → error handling

**Database Layer** (`src/db/`)

- Uses `pg-promise` for PostgreSQL connections
- Configuration via environment variables (supports `DATABASE_URL` or individual `PG*` vars)
- SSL support with `PGSSL` and `PGSSL_ALLOW_UNAUTHORIZED` env vars
- Automatic timestamp conversion to UTC
- Two schemas: `public` (users, auth, surveys) and `survey` (survey-specific data)
- `DBMigrator` handles schema migrations automatically on startup
- `SqlSelectBuilder` provides query building utilities

**Repository Pattern** (`src/repository/`)

- Data access layer organized by entity (authGroup, user, survey, record, chain, dataQuery)
- Each repository exports focused data access functions
- Uses raw SQL queries stored in `.sql` files for complex operations
- SQL files are copied to `dist/` during build

**API Layer** (`src/api/`)

- Modular API structure: Auth, Chain, DataQuery
- Each module implements `ExpressInitializer` interface with `init(express)` method
- `ApiEndpoint` and `ApiAuthMiddleware` utilities for route definition
- Middleware in `src/server/middleware/` handles cross-cutting concerns

**Job System** (`src/job/`)

- Background job processing with worker threads
- `JobServer` - Abstract base class for implementing jobs
- `JobManager` - Manages job lifecycle and communication
- `JobRegistry` - Registers available job types
- Jobs communicate via message passing (`JobMessageIn`/`JobMessageOut`)

**WebSocket** (`src/webSocket/`)

- Real-time communication using Socket.IO
- `WebSocketServer` manages connections
- `WebSocketEvent` enum defines event types

**Worker Threads** (`src/thread/`)

- `Worker` - Base class for worker implementations
- `Thread` - Thread management utilities
- `WorkerCache` - Caching for worker results
- Used by job system for parallel processing

### Package Structure

This is a library package (not a standalone application):

- Main export: `dist/index.js`
- Type definitions: `dist/index.d.ts`
- Published to GitHub Packages as `@openforis/arena-server`
- All exports defined in `src/index.ts`

### Environment Configuration

Required `.env` file (see `.env.template`):

- Database: `DATABASE_URL` or `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
- Database SSL: `PGSSL`, `PGSSL_ALLOW_UNAUTHORIZED`
- Express: `PORT`, `SESSION_ID_COOKIE_SECRET`, `TEMP_FOLDER`, `USE_HTTPS`
- Migrations: `DISABLE_DB_MIGRATIONS`

### Local Development Database

Start PostgreSQL with PostGIS:

```bash
sudo docker run -d --name arena-db -p 5444:5432 \
  -e POSTGRES_DB=arena -e POSTGRES_PASSWORD=arena -e POSTGRES_USER=arena \
  postgis/postgis:12-3.0
```

Restart database:

```bash
docker container restart arena-db
```

## Key Patterns

**Service Registration**: Services are registered in `src/server/arenaServer/registerServices.ts` before app initialization

**Express Initializers**: All API modules and middleware follow the `ExpressInitializer` pattern with an `init(express: Express)` method

**Database Schemas**: Multi-schema architecture (`public` and `survey`) with separate migration paths

**TypeScript Strictness**: Full strict mode enabled - all type issues must be resolved

**Asset Handling**: SQL files are code assets and must be copied to `dist/` alongside compiled TypeScript

## GitHub Packages Authentication

This package depends on `@openforis/arena-core` from GitHub Packages. Configure `.npmrc`:

```
@openforis:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```
