import { betterAuth } from "better-auth";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { prisma8Adapter } from "better-auth-adapter-prisma8";
import { getRequestEvent } from "$app/server";
import { db } from "../prisma/db";
import {
	allowedDomainsLabel,
	hostedDomain,
	isAllowedEmail,
} from "./server/auth-policy";

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	database: prisma8Adapter(db, {
		provider: "postgresql",
		transaction: true,
	}),
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			// Reject non-Workspace accounts at Google, before we ever see them.
			hd: hostedDomain(),
			// Always let the member pick which Google account to use.
			prompt: "select_account",
		},
	},
	account: {
		// Refresh tokens are long-lived credentials; keep them encrypted at rest.
		encryptOAuthTokens: true,
	},
	user: {
		/**
		 * Second, server-side gate. `hd` proves the account belongs to *a*
		 * Workspace tenant; this decides whether that tenant is ours. It runs on
		 * `create-user`, `link-account` and every returning OAuth `sign-in`, and
		 * receives the fresh provider email each time — so a user whose address
		 * moved out of the org loses access on their next sign-in.
		 */
		validateUserInfo: ({ user }) => {
			if (isAllowedEmail(user.email as string | null | undefined)) return;

			const label = allowedDomainsLabel();
			return {
				error: "email_not_allowed",
				errorDescription: label
					? `Use your ${label} Google Workspace account to sign in.`
					: "Sign-in is not configured for any email domain yet.",
			};
		},
	},
	plugins: [
		// Must stay last: lets server actions/loads set auth cookies.
		sveltekitCookies(getRequestEvent),
	],
});
