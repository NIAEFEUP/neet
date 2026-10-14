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
		<!-- Fixed width so stepping pages cannot shift the arrows under the finger.
		     Only when there are arrows to sit between, though — otherwise it would
		     be indented from the edge the grid itself starts on. -->
		<span
			class={[
				"font-medium text-gray-900 text-sm",
				showNavigation ? "min-w-28 text-center" : "",
			]}
		>
			{rangeLabel}
		</span>
		{#if showNavigation}
			{@render navButton("›", "Next days", canGoNext, onNext)}
		{/if}
	</div>

	<!-- Nothing to say when nothing is chosen: the toolbar collapses to just the
	     range, and the grid explains itself instead. -->
	{#if selectedCount > 0}
		<div class="flex items-center gap-2">
			<!-- Tabular figures: proportional digits would reflow this row on every
			     cell the drag crosses. -->
			<span class="tabular-nums text-gray-400 text-xs">
				{selectedCount} selected
			</span>
			<button
				onclick={onClear}
				class="cursor-pointer rounded-full px-3 py-1.5 font-medium text-gray-500 text-sm transition-[background-color,color,scale] duration-150 ease-out [-webkit-touch-callout:none] hover:bg-gray-100 hover:text-gray-900 active:scale-95"
			>
				Clear
			</button>
		</div>
	{/if}
</div>
