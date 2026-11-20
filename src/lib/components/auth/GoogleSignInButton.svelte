<script lang="ts">
import { authClient } from "$lib/client/auth-client";
import {
	Button,
	type ButtonSize,
	type ButtonVariant,
} from "$lib/components/ui/button";
import { cn } from "$lib/utils";

type Props = {
	/** Where to land after consent. */
	callbackURL?: string;
	/** Where Better Auth sends rejections (`?error=<code>`). */
	errorCallbackURL?: string;
	label?: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
	class?: string;
	disabled?: boolean;
};

let {
	callbackURL = "/",
	errorCallbackURL = "/login",
	label = "Continue with Google",
	variant = "outline",
	size = "lg",
	class: className = "",
	disabled = false,
}: Props = $props();

let pending = $state(false);
let failure = $state<string | null>(null);

async function signIn() {
	pending = true;
	failure = null;

	try {
		// On success Better Auth assigns `window.location` to Google's
		// consent URL, so nothing after this resolves on the happy path.
		const { error } = await authClient.signIn.social({
			provider: "google",
			callbackURL,
			errorCallbackURL,
		});

		if (error) {
			failure =
				error.status === 404
					? "Sign-in isn't available yet. The server auth route isn't mounted."
					: "We couldn't reach Google. Try again in a moment.";
		}
	} catch {
		failure = "We couldn't reach Google. Check your connection and try again.";
	} finally {
		pending = false;
	}
}
</script>

<Button
	{variant}
	{size}
	class={cn(
		"gap-2.5 border-[#e0e0e0] bg-white font-medium text-[#0a0a0a] hover:bg-[#f6f6f6]",
		className,
	)}
	disabled={pending || disabled}
	onclick={signIn}
>
	<svg viewBox="0 0 48 48" class="size-[18px]" aria-hidden="true">
		<path
			fill="#EA4335"
			d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
		/>
		<path
			fill="#4285F4"
			d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
		/>
		<path
			fill="#FBBC05"
			d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
		/>
		<path
			fill="#34A853"
			d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
		/>
	</svg>
	{pending ? "Redirecting to Google…" : label}
</Button>

{#if failure}
	<p class="mt-2 text-[13px] leading-relaxed text-[#8a8a8a]" role="alert">{failure}</p>
{/if}
