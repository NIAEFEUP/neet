// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

/** The subset of a Better Auth user the UI needs. */
type AuthUser = {
	id: string;
	name: string;
	email: string;
	image?: string | null;
};

type AuthSession = {
	id: string;
	userId: string;
	expiresAt: Date;
};

declare global {
	namespace App {
		interface Error {}
		interface Locals {
			/** Populated by the auth handle hook once it is wired up. */
			user: AuthUser | null;
			session: AuthSession | null;
		}
		interface PageData {
			/** Provided by `src/routes/+layout.server.ts`, not by page loads. */
			user?: AuthUser | null;
		}
		interface PageState {}
		interface Platform {}
	}
}

export {};
