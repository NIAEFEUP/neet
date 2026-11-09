import type { PageServerLoad } from "./$types";

let cachedStars: number | null = null;
let refreshAfter = 0;

export const load: PageServerLoad = async ({ fetch }) => {
	if (Date.now() < refreshAfter) return { githubStars: cachedStars };

	try {
		const response = await fetch("https://api.github.com/repos/NIAEFEUP/neet", {
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": "neet",
			},
			signal: AbortSignal.timeout(1500),
		});
		if (!response.ok) throw new Error("GitHub repository data unavailable");
		const repository: { stargazers_count?: unknown } = await response.json();
		const stars = repository.stargazers_count;
		if (
			typeof stars !== "number" ||
			!Number.isSafeInteger(stars) ||
			stars < 0
		) {
			throw new Error("Invalid GitHub star count");
		}
		cachedStars = stars;
		refreshAfter = Date.now() + 10 * 60 * 1000;
	} catch {
		// Keep the last known count when GitHub is unavailable or rate-limited.
		refreshAfter = Date.now() + 30 * 1000;
	}

	return { githubStars: cachedStars };
};
