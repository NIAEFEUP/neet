import { createAuthClient } from "better-auth/svelte";

/**
 * Browser-side Better Auth client. It talks to the `/api/auth/*` routes that
 * `svelteKitHandler` mounts in `src/hooks.server.ts`.
 */
export const authClient = createAuthClient();
