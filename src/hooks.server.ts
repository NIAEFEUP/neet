import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { auth } from "$lib/auth";

/**
 * Mounts Better Auth's `/api/auth/*` endpoints and mirrors the current session
 * onto `event.locals` (which `src/app.d.ts` types) so loads, actions and the
 * layout can read it without each re-querying.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
};
