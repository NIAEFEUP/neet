<script lang="ts">
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { page } from "$app/state";
import "./layout.css";
import logo from "$lib/assets/favicon.svg";
import { authClient } from "$lib/client/auth-client";
import type { LayoutProps } from "./$types";

let { data, children }: LayoutProps = $props();
const isHome = $derived(page.route.id === "/");
/** The login page owns the whole viewport; no app chrome around it. */
const isBare = $derived(isHome || page.route.id === "/login");
const user = $derived(data.user ?? null);
const initial = $derived(user?.name.trim().charAt(0).toUpperCase() || "?");

let signingOut = $state(false);

async function signOut() {
	signingOut = true;
	try {
		await authClient.signOut();
	} catch {
		// Even if the request fails, drop the client anyway.
	}
	signingOut = false;
	await goto("/login", { invalidateAll: true });
}
</script>

<svelte:head>
	<link rel="icon" href={logo} />
</svelte:head>

<a
	href="#main-content"
	class="fixed top-3 left-3 z-50 -translate-y-24 rounded-md bg-[#0a0a0a] px-4 py-2 font-medium text-sm text-white transition-transform duration-150 ease-[var(--ease-out)] focus:translate-y-0"
>
	Skip to content
</a>

<!-- §7 mobile-native: safe-area-inset-top handled via padding -->
{#if !isBare}
<header
	class="sticky top-0 z-40 border-b border-[#e8e8e8] bg-white/90 backdrop-blur-sm"
	style="height: calc(3rem + env(safe-area-inset-top, 0px)); padding-top: env(safe-area-inset-top, 0px);"
>
	<div class="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
		<a
			href={resolve("/")}
			class="inline-flex items-center gap-2 rounded-md py-1 text-[#0a0a0a]"
			aria-label="neet home"
		>
			<img src={logo} alt="" width="20" height="20" class="h-5 w-5 shrink-0" />
			<span class="font-semibold text-[18px] leading-none tracking-[-0.05em]">neet</span>
		</a>

		<div class="flex items-center gap-1">
			{#if page.route.id !== "/create"}
				<a
					href={resolve("/create")}
					class="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-medium text-[13px] text-[#6b6b6b] transition-colors duration-150 ease-[var(--ease-out)] hover:text-[#0a0a0a]"
				>
					<svg viewBox="0 0 16 16" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
						<path
							d="M8 3.25v9.5M3.25 8h9.5"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
					New event
				</a>
			{/if}

			{#if user}
				<div class="ml-1 flex items-center gap-1.5 border-[#e8e8e8] pl-1 sm:border-l sm:pl-2.5">
					{#if user.image}
						<img src={user.image} alt="" width="24" height="24" class="size-6 shrink-0 rounded-full" />
					{:else}
						<span
							class="grid size-6 shrink-0 place-items-center rounded-full bg-[#f0f0f0] font-medium text-[11px] text-[#0a0a0a]"
							aria-hidden="true"
						>
							{initial}
						</span>
					{/if}
					<span class="hidden max-w-[16ch] truncate text-[13px] text-[#6b6b6b] sm:inline">
						{user.name}
					</span>
					<button
						type="button"
						onclick={signOut}
						disabled={signingOut}
						class="inline-flex h-8 items-center rounded-md px-2 font-medium text-[13px] text-[#6b6b6b] transition-colors duration-150 ease-[var(--ease-out)] hover:text-[#0a0a0a] disabled:opacity-50"
					>
						{signingOut ? "Signing out…" : "Sign out"}
					</button>
				</div>
			{/if}
		</div>
	</div>
</header>
{/if}

<!-- §3 mobile-native: 100dvh tracks visible area including browser chrome collapse -->
<main
	id="main-content"
	tabindex="-1"
	class={isHome ? "home-main" : undefined}
	style:min-height={isHome
		? undefined
		: "calc(100dvh - 3rem - env(safe-area-inset-top, 0px))"}	style:padding-bottom={isHome ? undefined : "env(safe-area-inset-bottom, 0px)"}
>
	{@render children()}
</main>

