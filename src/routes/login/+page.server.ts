import { redirect } from "@sveltejs/kit";
import { allowedDomainsLabel } from "$lib/server/auth-policy";
import type { PageServerLoad } from "./$types";

/** Only same-site paths are safe `redirectTo` targets. */
function safeRedirect(value: string | null): string {
	if (!value?.startsWith("/") || value.startsWith("//")) return "/";
	return value;
}

/**
 * Better Auth sends rejections back here as `?error=<code>`. The codes that
 * matter are the ones `user.validateUserInfo` returns, plus the handful of
 * generic failures a browser flow can produce.
 */
function describeError(code: string, label: string | null): string {
	switch (code) {
		case "email_not_allowed":
		case "domain_not_allowed":
		case "invalid_organization":
			return label
				? `Use your ${label} account to continue.`
				: "Use your organisation's Google account to continue.";
		case "access_denied":
			return "Sign-in was cancelled. Try again when you're ready.";
		case "banned":
			return "This account no longer has access.";
		case "account_not_linked":
			return "That account isn't linked to your neet account yet.";
		default:
			return "We couldn't sign you in. Try again, or pick another account.";
	}
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

	// Already signed in: there is nothing to do here.
	if (locals.user) redirect(303, redirectTo);

	const label = allowedDomainsLabel();
	const errorCode = url.searchParams.get("error");

	return {
		redirectTo,
		error: errorCode ? describeError(errorCode, label) : null,
		domainHint: label,
	};
};
