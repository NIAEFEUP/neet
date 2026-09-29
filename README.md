# neet

Internal availability scheduling tool for [NIAEFEUP](https://niaefeup.pt), inspired by [Lettuce Meet](https://lettucemeet.com). People submit their availabilities and the system cross-references them so the creator can easily find a time that works for everyone and schedule it.

## Tech Stack

- [SvelteKit](https://svelte.dev/docs/kit) — full-stack framework
- [Svelte 5](https://svelte.dev) (runes mode) — UI
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Tailwind CSS 4](https://tailwindcss.com/) — styling
- [Vite](https://vite.dev/) — build tool
- [pnpm](https://pnpm.io/) — package manager

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/installation)

### Setup

1. **Install dependencies:**
   ```sh
   pnpm install
   ```

2. **Set up environment variables:**
   ```sh
   cp .env.example .env
   ```

3. **Start the database:**
   Make sure you have Docker installed and running, then start the local PostgreSQL database:
   ```sh
   docker compose up -d
   ```

4. **Initialize Prisma:**
   Initialize the database with your Prisma contract (this creates the tables):
   ```sh
   pnpm prisma db init
   ```

### Useful Commands

Here are some handy commands for working with the database and Prisma:

- **`pnpm run studio`** — Opens Prisma Studio directly so you can visually inspect and edit your database tables.
- **`pnpm run contract:emit`** — Re-generates TypeScript types (`contract.d.ts`) after you edit your `src/prisma/contract.prisma` file.
- **`pnpm prisma db update`** — Quickly syncs any schema changes you made in `contract.prisma` to your local database (great for rapid local development).

### Development

```sh
pnpm dev
```

The app will be available at `http://localhost:5173`.

### Build

```sh
pnpm build
```

Preview the production build:

```sh
pnpm preview
```

### Type checking

```sh
pnpm check
```

## Project Structure

```
src/
├── lib/          # Shared utilities and components ($lib alias)
├── routes/       # SvelteKit routes (pages)
├── app.html      # HTML template
└── app.d.ts      # Type declarations
static/           # Static assets
```

## Deployment

This project uses `@sveltejs/adapter-auto`. To deploy, install the appropriate adapter for your target environment and run `pnpm build`. See the [SvelteKit adapters docs](https://svelte.dev/docs/kit/adapters) for more info.

## License

Private — internal use by NIAEFEUP.
