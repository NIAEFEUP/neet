<script lang="ts">
interface Props {
	/** The days currently on screen, e.g. 'Oct 14 – 20'. */
	rangeLabel: string;
	/** Ranges of a week or less fit on one page and get no controls. */
	showNavigation: boolean;
	canGoPrevious: boolean;
	canGoNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
	selectedCount: number;
	onClear: () => void;
}

let {
	rangeLabel,
	showNavigation,
	canGoPrevious,
	canGoNext,
	onPrevious,
	onNext,
	selectedCount,
	onClear,
}: Props = $props();
</script>

{#snippet navButton(
	glyph: string,
	label: string,
	enabled: boolean,
	onClick: () => void,
)}
	<!-- Borderless: a control only shows itself under the pointer. -->
	<button
		onclick={onClick}
		disabled={!enabled}
		aria-label={label}
		class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-400 text-lg leading-none transition-[background-color,color,scale] duration-150 ease-out [-webkit-touch-callout:none] enabled:hover:bg-gray-100 enabled:hover:text-gray-700 enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
	>
		{glyph}
	</button>
{/snippet}

<!-- One bar of chrome, no divider: spacing does the separating. -->
<div class="mb-3 flex items-center justify-between gap-3">
	<div class="flex items-center gap-1">
		{#if showNavigation}
			{@render navButton("‹", "Previous days", canGoPrevious, onPrevious)}
		{/if}
		<!-- Fixed width so stepping pages cannot shift the arrows under the finger. -->
		<span class="min-w-28 text-center font-medium text-gray-900 text-sm">
			{rangeLabel}
		</span>
		{#if showNavigation}
			{@render navButton("›", "Next days", canGoNext, onNext)}
		{/if}
	</div>

	<div class="flex items-center gap-2">
		<!-- Tabular figures: proportional digits would reflow this row on every
		     cell the drag crosses. -->
		<span class="tabular-nums text-gray-400 text-xs">
			{selectedCount} blocks selected
		</span>
		<button
			onclick={onClear}
			disabled={selectedCount === 0}
			class="cursor-pointer rounded-full px-3 py-1.5 font-medium text-gray-500 text-sm transition-[background-color,color,scale] duration-150 ease-out [-webkit-touch-callout:none] enabled:hover:bg-gray-100 enabled:hover:text-gray-900 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
		>
			Clear
		</button>
	</div>
</div>
