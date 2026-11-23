/**
 * The org's Workspace domain(s).
 *
 * `GOOGLE_HOSTED_DOMAIN` is the primary tenant (also sent to Google as `hd`);
 * `ALLOWED_EMAIL_DOMAINS` covers extra domains as a comma-separated list.
 */
export function allowedDomains(): string[] {
	const raw = [
		process.env.GOOGLE_HOSTED_DOMAIN ?? "",
		process.env.ALLOWED_EMAIL_DOMAINS ?? "",
	]
		.join(",")
		.split(",")
		.map((domain) => domain.trim().replace(/^@/, "").toLowerCase())
		.filter(Boolean);

	return [...new Set(raw)];
}

/** `hd` value for the Google provider: one tenant, or any tenant when several. */
export function hostedDomain(): string {
	const domains = allowedDomains();
	return domains.length === 1 ? domains[0] : "*";
}

/**
 * Exact domain match — deliberately not a suffix check, so `evil-nifeup.com`
 * or `nifeup.com.attacker.io` cannot slip through.
 *
 * No configured domains means nobody is allowed: the gate fails closed.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
	if (typeof email !== "string") return false;

	const at = email.lastIndexOf("@");
	if (at <= 0) return false;

	const domain = email.slice(at + 1).toLowerCase();
	return allowedDomains().includes(domain);
}

/** Human-readable list for rejection copy, e.g. `"@nifeup.com"`. */
export function allowedDomainsLabel(): string | null {
	const domains = allowedDomains();
	return domains.length > 0
		? domains.map((domain) => `@${domain}`).join(" or ")
		: null;
}
