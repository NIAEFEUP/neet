import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

/** Routes reachable without a session. Everything else redirects to /login. */
const PUBLIC_PATHS = new Set(["/", "/login"]);

/**
 * Exposes the signed-in member to the app shell. Until the auth `handle` hook
 * populates `locals.user`, this is always `null` and the header shows no
 * account chip.
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Never bounce a public route onto itself (or /login onto /login).
	if (!locals.user && !PUBLIC_PATHS.has(url.pathname)) {
		const redirectTo = `${url.pathname}${url.search}`;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	return { user: locals.user ?? null };
};
