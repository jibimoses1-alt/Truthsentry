### TruthSentry

TruthSentry is being built to let people submit claims (including in Fula/Peul), return AI-verified answers when possible, and queue unmatched items for human review. Delivery includes a web experience and campaign links (for example from WhatsApp).

**[Website »](https://truthsentry.org)**

## About the Project

TruthSentry is being built to let people submit claims (including in Fula/Peul), return AI-verified answers when possible, and queue unmatched items for human review. Delivery includes a web experience and campaign links (for example from WhatsApp).

Private internal monorepo for the TruthSentry program. It brings together a Next.js web surface, an API layer built with tRPC, Prisma talking to PostgreSQL on Supabase, and Resend for transactional email (account and system messages such as sign-in and notifications—keep bulk or campaign mail out of this codebase unless you intentionally add it). Shared UI lives in `packages/ui` (COSS-oriented primitives); tRPC routers, the Prisma schema and client, and email modules stay in their own packages so `apps/web` and `apps/api` remain orchestration-only. Nothing here is meant for public npm publishing; version bumps and changesets exist for your own releases and deployment discipline.

### Built With

- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://prisma.io/)
- [Supabase](https://supabase.com/)
- [Resend](https://resend.com/)

## Getting Started

### Prerequisites

Here is what you need:

- Node.js (Version: `>=20.x`)
- pnpm (Version: `>=9.0.0`)
- PostgreSQL (or Supabase project)
- Docker (optional)

Verify:

```sh
node --version
pnpm --version
git --version
docker --version
```

## Development

### Setup

1. Clone the repository (use your private remote URL)

```sh
 git clone <PRIVATE_REPO_URL>
 cd truthsentry
```

2. Install dependencies

```sh
 pnpm install
```

3. Configure environment files

- Copy example files:
    - `apps/web/.env.example`
    - `apps/api/.env.example`
    - `packages/emails/.env.example`
    - `packages/prisma/.env.example`
- Fill values using `docs/env/README.md`.

4. Run env checks

```sh
 pnpm env-check:web
 pnpm env-check:api
 pnpm env-check:emails
```

5. Start development

```sh
 pnpm dev
```

Focused workflows:

### Deploy web (Vercel)

The web app is a Next.js monorepo package under `apps/web`. Vercel must treat that directory as the project root; do not use Framework Preset **Other** with Output Directory `public` (that causes `No Output Directory named "public"` after a successful turbo build).

In the Vercel project **Settings → General**:

| Setting | Value |
|---------|--------|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js |
| **Build Command** | leave default (uses `apps/web/vercel.json`) or empty |
| **Output Directory** | leave **empty** (Next.js manages `.next`) |
| **Install Command** | leave default (uses `apps/web/vercel.json`) |

`apps/web/vercel.json` installs from the monorepo root and runs `pnpm turbo run build --filter=./apps/web` so workspace packages (`@truthsentry/ui`, `@truthsentry/trpc`, Prisma client, etc.) build correctly.

The API (`apps/api`) is a separate Node service; deploy it on a host that runs long-lived processes (not this Vercel static/Next project).

## Project Structure

```text
truthsentry/
├── apps/
│   ├── web/                  # @truthsentry/web
│   └── api/                  # @truthsentry/api
├── packages/
│   ├── ai/                   # @truthsentry/ai
│   ├── emails/               # @truthsentry/emails
│   ├── prisma/               # @truthsentry/prisma
│   ├── testing/              # @truthsentry/testing
│   ├── trpc/                 # @truthsentry/trpc
│   └── ui/                   # @truthsentry/ui
├── configs/
│   ├── eslint/               # @truthsentry/configs-eslint
│   └── typescript/           # @truthsentry/configs-typescript
├── docs/
├── specs/                    # Spec-driven product + feature specs (see specs/README.md)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Adding Dependencies

Add to a specific workspace package:

```sh
pnpm add <package-name> --filter @truthsentry/web
pnpm add <package-name> --filter @truthsentry/api
pnpm add <package-name> --filter @truthsentry/ui
```

Add a dev dependency to one package:

```sh
pnpm add -D <package-name> --filter @truthsentry/web
```

Add at root:

```sh
pnpm add <package-name> -w
```

Use local workspace packages:

```json
{
    "dependencies": {
        "@truthsentry/ui": "workspace:*",
        "@truthsentry/trpc": "workspace:*"
    }
}
```

## Building

Build all packages/apps:

```sh
pnpm build
```

Build specific targets:

```sh
pnpm build --filter @truthsentry/web
pnpm build --filter @truthsentry/api
```

Type-check:

```sh
pnpm typecheck
```

## Testing

```sh
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:ui
pnpm tdd
```

## Prisma

```sh
pnpm prisma
pnpm db:studio
```

## Docker Deployment

Use application-specific Dockerfiles where available.

Typical pattern:

```sh
docker build -f apps/api/Dockerfile -t truthsentry-api:latest .
docker build -f apps/web/Dockerfile -t truthsentry-web:latest .
```

Run:

```sh
docker run -p 3000:3000 --env-file .env.production truthsentry-api:latest
docker run -p 3000:3000 --env-file .env.production truthsentry-web:latest
```

## Scripts Reference

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:api`
- `pnpm dev:all`
- `pnpm build`
- `pnpm lint`
- `pnpm lint:fix`
- `pnpm format`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm test:ui`
- `pnpm tdd`
- `pnpm env-check:web`
- `pnpm env-check:api`
- `pnpm env-check:emails`
- `pnpm prisma`
- `pnpm db:studio`

## AI Skills

Project skills are managed with the `skills` CLI and tracked in `skills-lock.json`.

Add the Vercel AI skill:

```sh
npx skills add vercel/ai -y
```

List, check, and update skills:

```sh
npx skills list
npx skills check
npx skills update
npx @tanstack/intent@latest stale
```

After adding or updating skills, commit:

- `skills-lock.json`
- generated skill files under `.agents/skills/`

## Changesets

This monorepo is **private and internal**. Changesets is configured with **restricted** access and internal/private-package settings (no public changelog). Use it only if you want optional internal version bookkeeping.

Versioning commands:

```sh
pnpm changeset
pnpm version-packages
pnpm changeset status
```

`pnpm release` is intentionally a **no-op** guardrail so nothing is published from this workspace by mistake.

## Contributing

1. Clone from your private remote and create a branch:

- `@username/feature-your-task`
- `@username/fix-your-bug-fix`

2. Install dependencies: `pnpm install`
3. Run checks before PR:

```sh
 pnpm lint
 pnpm typecheck
 pnpm test
```

4. Open PR with context and test notes.

Conventional commit types:

- `feat`
- `fix`
- `chore`
- `refactor`
- `docs`
- `test`
- `style`
- `perf`
- `ci`
- `build`

## License

This project is licensed under the MIT License.
