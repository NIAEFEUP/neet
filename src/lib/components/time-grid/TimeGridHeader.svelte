<script lang="ts">
	interface Props {
		selectedCount: number;
		onClear: () => void;
	}

	let { selectedCount, onClear }: Props = $props();
</script>

<div class="flex justify-between items-center mb-4">
	<h2 class="text-xl font-semibold">Time Grid</h2>
	<div class="flex items-center gap-3">
		<span class="text-sm text-gray-500">{selectedCount} blocks selected</span>
		<button
			onclick={onClear}
			disabled={selectedCount === 0}
			class="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white cursor-pointer transition-colors duration-150 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			Clear
		</button>
	</div>
</div>
