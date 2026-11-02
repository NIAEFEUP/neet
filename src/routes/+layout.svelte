<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { resolve } from "$app/paths";
import { page } from "$app/state";
import "./layout.css";
// biome-ignore lint/correctness/noUnusedImports: used inside <svelte:head>
import favicon from "$lib/assets/favicon.svg";

// biome-ignore lint/correctness/noUnusedVariables: rendered with {@render children()}
let { children } = $props();
// biome-ignore lint/correctness/noUnusedVariables: used in markup
const isHome = $derived(page.url.pathname === "/");
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a
	href="#main-content"
	class="fixed top-3 left-3 z-50 -translate-y-24 rounded-md bg-[#0a0a0a] px-4 py-2 font-medium text-sm text-white transition-transform duration-150 ease-[var(--ease-out)] focus:translate-y-0"
>
	Skip to content
</a>

<!-- §7 mobile-native: safe-area-inset-top handled via padding -->
<header
	class="sticky top-0 z-40 h-12 border-b border-[#e8e8e8] bg-white/90 backdrop-blur-sm"
	style="padding-top: env(safe-area-inset-top, 0px);"
>
	<div class="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
		<a
			href={resolve("/")}
			class="inline-flex items-center gap-2 rounded-md py-1 text-[#0a0a0a]"
			aria-label="neet home"
		>
			<svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" aria-hidden="true">
				<rect x="1" y="1" width="22" height="22" rx="5" fill="#166534" />
				<path d="M8 1v22M16 1v22M1 8h22M1 16h22" stroke="#fff" stroke-opacity=".2" />
				<rect x="8.7" y="8.7" width="6.6" height="6.6" rx="1" fill="#fff" />
				<rect x="16.7" y="1.7" width="5.6" height="5.6" rx=".8" fill="#86efac" />
			</svg>
			<span class="font-semibold text-[18px] leading-none tracking-[-0.05em]">neet</span>
		</a>

		{#if !isHome}
			<a
				href={resolve("/")}
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
	</div>
</header>

<!-- §3 mobile-native: 100dvh tracks visible area including browser chrome collapse -->
<main
	id="main-content"
	tabindex="-1"
	class="min-h-[calc(100dvh-3rem)]"
	style="padding-bottom: env(safe-area-inset-bottom, 0px);"
>
	{@render children()}
</main>

