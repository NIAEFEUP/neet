<script lang="ts">
interface Props {
	selectedCount: number;
	onClear: () => void;
}

let { selectedCount, onClear }: Props = $props();
</script>

<div class="mb-4 flex items-center justify-between gap-4">
	<div class="flex items-baseline gap-3">
		<h2 class="font-semibold text-xl">Time Grid</h2>
		<!-- Only one of these is ever shown, so the affordance matches the input device. -->
		<span class="hidden text-gray-500 text-sm [@media(pointer:coarse)]:inline">
			Tap to mark · drag sideways or hold to paint
		</span>
		<span class="text-gray-500 text-sm [@media(pointer:coarse)]:hidden">
			Drag to paint
		</span>
	</div>

	<div class="flex items-center gap-3">
		<span class="text-gray-500 text-sm">{selectedCount} blocks selected</span>
		<button
			onclick={onClear}
			disabled={selectedCount === 0}
			class="cursor-pointer rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [-webkit-touch-callout:none] enabled:hover:bg-gray-100 enabled:active:scale-[0.97] motion-reduce:transition-colors disabled:cursor-not-allowed disabled:opacity-50"
		>
			Clear
		</button>
	</div>
</div>
