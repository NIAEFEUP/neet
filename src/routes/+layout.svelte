<script lang="ts">
import "./layout.css";
// biome-ignore lint/correctness/noUnusedImports: used inside <svelte:head>
import favicon from "$lib/assets/favicon.svg";

// biome-ignore lint/correctness/noUnusedVariables: rendered with {@render children()}
let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
