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

```sh
pnpm install
```

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
