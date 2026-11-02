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
		type="button"
		onclick={onClick}
		disabled={!enabled}
		aria-label={label}
		class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#9b9b9b] text-lg leading-none transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] [-webkit-touch-callout:none] enabled:hover:bg-[#f5f5f5] enabled:hover:text-[#0a0a0a] enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
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
				"font-medium text-[#0a0a0a] text-[13px]",
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
		<div class="flex items-center gap-2" aria-live="polite">
			<!-- Tabular figures: proportional digits would reflow this row on every
			     cell the drag crosses. -->
			<span class="tabular-nums text-[#9b9b9b] text-[11px]">
				{selectedCount} selected
			</span>
			<button
				type="button"
				onclick={onClear}
				class="cursor-pointer rounded-md px-2.5 py-1 font-medium text-[#6b6b6b] text-[12px] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] [-webkit-touch-callout:none] hover:bg-[#f5f5f5] hover:text-[#0a0a0a] active:scale-95"
			>
				Clear
			</button>
		</div>
	{/if}
</div>

