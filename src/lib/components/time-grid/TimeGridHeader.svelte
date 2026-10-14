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
	<button
		onclick={onClick}
		disabled={!enabled}
		aria-label={label}
		class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [-webkit-touch-callout:none] enabled:hover:bg-gray-100 enabled:active:scale-[0.97] motion-reduce:transition-colors disabled:cursor-not-allowed disabled:opacity-40"
	>
		{glyph}
	</button>
{/snippet}

<!-- One bar for all of the grid's chrome. The page owns the title, so this
     stays a control strip rather than a header block. -->
<div class="mb-3 flex items-center justify-between gap-3">
	<div class="flex items-center gap-1.5">
		{#if showNavigation}
			{@render navButton("‹", "Previous days", canGoPrevious, onPrevious)}
		{/if}
		<!-- Fixed width so stepping pages cannot shift the arrows under the finger. -->
		<span class="min-w-28 text-center font-medium text-gray-700 text-sm">
			{rangeLabel}
		</span>
		{#if showNavigation}
			{@render navButton("›", "Next days", canGoNext, onNext)}
		{/if}
	</div>

	<div class="flex items-center gap-3">
		<!-- Tabular figures: proportional digits would reflow this row on every
		     cell the drag crosses. -->
		<span class="tabular-nums text-gray-500 text-sm">
			{selectedCount} blocks selected
		</span>
		<button
			onclick={onClear}
			disabled={selectedCount === 0}
			class="cursor-pointer rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [-webkit-touch-callout:none] enabled:hover:bg-gray-100 enabled:active:scale-[0.97] motion-reduce:transition-colors disabled:cursor-not-allowed disabled:opacity-50"
		>
			Clear
		</button>
	</div>
</div>
