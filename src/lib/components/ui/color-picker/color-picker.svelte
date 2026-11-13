<script lang="ts">
import {
	ColorPicker,
	type ColorPickerValueChangeDetails,
	parseColor,
} from "@ark-ui/svelte/color-picker";
import { Portal } from "@ark-ui/svelte/portal";
import PipetteIcon from "@lucide/svelte/icons/pipette";
import { onMount, type Snippet } from "svelte";
import { cn } from "$lib/utils.js";

type Props = {
	value: string;
	onValueChange: (value: string) => void;
	open?: boolean;
	disabled?: boolean;
	triggerClass?: string;
	triggerStyle?: string;
	triggerLabel?: string;
	trigger: Snippet;
};

let {
	value,
	onValueChange,
	open = $bindable(false),
	disabled = false,
	triggerClass,
	triggerStyle,
	triggerLabel = "Change color",
	trigger,
}: Props = $props();

let canUseEyeDropper = $state(false);

onMount(() => {
	canUseEyeDropper = "EyeDropper" in window;
});

const currentColor = $derived(parseColor(value || "#000000"));

function handleValueChange(details: ColorPickerValueChangeDetails) {
	onValueChange(details.value.toString("hex").toLowerCase());
}
</script>

<ColorPicker.Root
	bind:open
	value={currentColor}
	format="hsla"
	{disabled}
	positioning={{ placement: "bottom-end", gutter: 8 }}
	onValueChange={handleValueChange}
	class="contents"
>
	<ColorPicker.Trigger
		class={cn(
			"cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
			triggerClass,
		)}
		style={triggerStyle}
		title={triggerLabel}
		aria-label={triggerLabel}
	>
		{@render trigger()}
	</ColorPicker.Trigger>

	<Portal>
		<ColorPicker.Positioner class="z-50">
			<ColorPicker.Content
				aria-label="Color picker"
				class="color-picker-content flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg outline-none"
			>
				<ColorPicker.Area
					class="relative h-40 w-full touch-none overflow-hidden rounded-md border border-border"
				>
					<ColorPicker.AreaBackground class="size-full rounded-[inherit]" />
					<ColorPicker.AreaThumb
						class="size-4 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10 outline-none"
					/>
				</ColorPicker.Area>

				<div class="flex items-center gap-2">
					{#if canUseEyeDropper}
						<ColorPicker.EyeDropperTrigger
							class="grid size-7 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							<PipetteIcon class="size-3.5" aria-hidden="true" />
						</ColorPicker.EyeDropperTrigger>
					{/if}

					<ColorPicker.View format="hsla" class="min-w-0 flex-1">
						<ColorPicker.ChannelSlider
							channel="hue"
							class="flex h-3 w-full touch-none select-none items-center"
						>
							<ColorPicker.ChannelSliderTrack
								class="h-3 w-full grow overflow-hidden rounded-full"
							/>
							<ColorPicker.ChannelSliderThumb
								class="-translate-1/2 relative size-4 shrink-0 rounded-full border-2 border-white bg-white shadow-sm ring-1 ring-black/10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
							/>
						</ColorPicker.ChannelSlider>
					</ColorPicker.View>
				</div>

				<div class="flex items-center gap-2">
					<ColorPicker.ValueSwatch class="size-8 shrink-0 rounded-md border shadow-xs" />
					<ColorPicker.ChannelInput
						channel="hex"
						aria-label="Hex color"
						class="h-8 min-w-0 flex-1 rounded-md border bg-background px-2.5 font-mono text-base uppercase tabular-nums shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
					/>
				</div>
			</ColorPicker.Content>
		</ColorPicker.Positioner>
	</Portal>
</ColorPicker.Root>

<style>
	:global(.color-picker-content[data-state="open"]) {
		animation: color-picker-in 120ms var(--ease-out);
	}

	@keyframes color-picker-in {
		from {
			opacity: 0;
			scale: 0.97;
		}
		to {
			opacity: 1;
			scale: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.color-picker-content) {
			animation: none;
		}
	}
</style>
