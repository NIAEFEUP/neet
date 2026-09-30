<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { page } from "$app/stores";
import type { PageData } from "./$types";

// biome-ignore lint/correctness/noUnusedVariables: used in markup
let { data } = $props<{ data: PageData }>();
</script>

<div class="max-w-2xl mx-auto p-6 bg-white shadow rounded-xl mt-10 text-center">
	<h1 class="text-3xl font-bold mb-2 text-green-700">{data.event.title}</h1>
	{#if data.event.description}
		<p class="text-gray-600 mb-6">{data.event.description}</p>
	{/if}
	
	<div class="mb-6 inline-flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
		<span>📅</span>
		<span>{data.event.startDate} to {data.event.endDate} ({data.event.timezone})</span>
	</div>

	<p class="text-gray-600 mb-6">Share this URL with your guests to invite them.</p>

	<div class="bg-gray-100 p-4 rounded-md font-mono text-sm break-all">
		{$page.url.href}
	</div>

	<div class="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-left">
		<p class="text-yellow-800 text-sm font-medium">Coming next in Issue #6:</p>
		<p class="text-yellow-700 text-xs mt-1">The interactive grid will appear here for guests to submit their availability.</p>
	</div>
</div>
