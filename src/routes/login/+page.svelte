<script lang="ts">
import logo from "$lib/assets/favicon.svg";
import GoogleSignInButton from "$lib/components/auth/GoogleSignInButton.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();

// Server-side rejection copy (`?error=<code>`), already humanised by load.
const message = $derived(data.error);
</script>

<svelte:head>
	<title>Sign in · neet</title>
	<meta name="description" content="Sign in to neet with your organisation Google account." />
</svelte:head>

<div class="mx-auto flex w-full max-w-sm flex-col justify-center px-6 py-20">
	<div class="flex items-center gap-2">
		<img src={logo} alt="" width="24" height="24" class="h-6 w-6" />
		<span class="font-semibold text-[19px] leading-none tracking-[-0.05em] text-[#0a0a0a]">neet</span>
	</div>

	<h1 class="mt-8 font-semibold text-[26px] leading-[1.15] tracking-[-0.02em] text-[#0a0a0a]">
		Find a time together.
	</h1>
	<p class="mt-2 text-[15px] leading-relaxed text-[#6b6b6b]">
		Sign in to create events and share your availability.
	</p>

	{#if message}
		<p
			class="mt-6 rounded-lg border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-3 text-[13px] leading-relaxed text-[#0a0a0a]"
			role="alert"
		>
			{message}
		</p>
	{/if}

	<GoogleSignInButton
		class="mt-6 w-full justify-center"
		label={message ? "Try another account" : "Continue with Google"}
		callbackURL={data.redirectTo}
		errorCallbackURL={`/login?redirectTo=${encodeURIComponent(data.redirectTo)}`}
	/>

	<p class="mt-5 text-[13px] leading-relaxed text-[#8a8a8a]">
		{#if data.domainHint}
			Only <span class="text-[#0a0a0a]">{data.domainHint}</span> Google Workspace accounts can sign in.
		{:else}
			Only members of our Google Workspace can sign in.
		{/if}
	</p>
</div>
