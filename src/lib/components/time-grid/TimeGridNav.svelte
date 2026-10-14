<script lang="ts">
interface Props {
	label: string;
	canGoPrevious: boolean;
	canGoNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
}

let { label, canGoPrevious, canGoNext, onPrevious, onNext }: Props = $props();
</script>

<div class="mb-3 flex items-center justify-between gap-3">
	<span class="text-gray-600 text-sm">{label}</span>
	<div class="flex items-center gap-1.5">
		<button
			onclick={onPrevious}
			disabled={!canGoPrevious}
			aria-label="Previous days"
			class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [-webkit-touch-callout:none] enabled:hover:bg-gray-100 enabled:active:scale-[0.97] motion-reduce:transition-colors disabled:cursor-not-allowed disabled:opacity-40"
		>
			‹
		</button>
		<button
			onclick={onNext}
			disabled={!canGoNext}
			aria-label="Next days"
			class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [-webkit-touch-callout:none] enabled:hover:bg-gray-100 enabled:active:scale-[0.97] motion-reduce:transition-colors disabled:cursor-not-allowed disabled:opacity-40"
		>
			›
		</button>
	</div>
</div>
