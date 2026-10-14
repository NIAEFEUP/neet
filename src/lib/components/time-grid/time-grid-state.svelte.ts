import { cellKey, cellKeyToDate, getCellsInRect } from "./grid-utils";
import type { CellCoord, CellVisualState, SelectedCells } from "./types";

export interface TimeGridStateOptions {
	/** Reads the externally-owned selection — the caller's bindable `selected`. */
	getSelected: () => SelectedCells;
	/** Writes it back. Called once per committed change, never per cell. */
	setSelected: (selected: SelectedCells) => void;
	getDays?: () => Date[];
}

/**
 * The in-flight gesture and its rendering state, shared by mouse, touch and pen.
 *
 * Every input drives the same model: a drag records a start and an end cell, the
 * rectangle between them is the selection, and the change is committed on
 * release. Painting or erasing is decided once, from the cell the drag started
 * on, so a single drag can never flip between the two halfway through. Drags
 * with no movement commit a single cell, which is what makes a tap work.
 *
 * The selection itself is *not* stored here. It lives with the caller (a
 * bindable prop), and this class reads and writes it through `getSelected` /
 * `setSelected`. That keeps exactly one source of truth, so an external reset
 * is reflected immediately without a sync effect.
 *
 * Touch needs one extra phase: a press is held still for a moment before it may
 * become a drag (see `setPressing`). Until then the gesture could still turn out
 * to be a scroll, and the cell shows the `pressing` affordance.
 */
export class TimeGridState {
	isDragging = $state(false);
	paintMode = $state(true);
	dragStartCell = $state<CellCoord | null>(null);
	dragEndCell = $state<CellCoord | null>(null);
	pressingCell = $state<CellCoord | null>(null);

	private getSelected: () => SelectedCells;
	private setSelected: (selected: SelectedCells) => void;
	private getDays?: () => Date[];

	constructor(options: TimeGridStateOptions) {
		this.getSelected = options.getSelected;
		this.setSelected = options.setSelected;
		this.getDays = options.getDays;
	}

	get days(): Date[] {
		return this.getDays?.() ?? [];
	}

	get selectedCells(): SelectedCells {
		return this.getSelected();
	}

	selectedCount = $derived(Object.keys(this.selectedCells).length);

	selectionRect = $derived.by(() => {
		if (!this.dragStartCell || !this.dragEndCell) return null;
		return getCellsInRect(this.dragStartCell, this.dragEndCell, this.days);
	});

	/** Replaces the selection wholesale. */
	setSelectedCells(cells: SelectedCells): void {
		this.setSelected(cells);
	}

	resolveKey(dateOrDayIndex: Date | string | number, hour: number): string {
		if (typeof dateOrDayIndex === "number") {
			const day = this.days[dateOrDayIndex];
			if (day) return cellKey(day, hour);
		}
		return cellKey(dateOrDayIndex, hour);
	}

	isSelected(dateOrDayIndex: Date | string | number, hour: number): boolean {
		return !!this.selectedCells[this.resolveKey(dateOrDayIndex, hour)];
	}

	isInDragSelection(
		dateOrDayIndex: Date | string | number,
		hour: number,
	): boolean {
		return (
			this.selectionRect?.includes(this.resolveKey(dateOrDayIndex, hour)) ??
			false
		);
	}

	isPressing(dateOrDayIndex: Date | string | number, hour: number): boolean {
		if (!this.pressingCell) return false;
		return (
			this.resolveKey(this.pressingCell.dayIndex, this.pressingCell.hour) ===
			this.resolveKey(dateOrDayIndex, hour)
		);
	}

	getCellVisualState(
		dateOrDayIndex: Date | string | number,
		hour: number,
	): CellVisualState {
		if (this.isInDragSelection(dateOrDayIndex, hour)) {
			return this.paintMode ? "actively-painting" : "actively-unpainting";
		}

		if (this.isPressing(dateOrDayIndex, hour)) {
			return "pressing";
		}

		if (this.isSelected(dateOrDayIndex, hour)) {
			return "painted";
		}

		return "idle";
	}

	/**
	 * Marks a cell as held, before the gesture is known to be a drag. Cleared on
	 * release, on cancel, and as soon as the finger moves far enough that the
	 * gesture is clearly a scroll.
	 */
	setPressing(coord: CellCoord | null): void {
		this.pressingCell = coord;
	}

	/** Starts a drag at `coord`, choosing paint or erase from the cell's current state. */
	beginDrag(coord: CellCoord): void {
		this.pressingCell = null;
		this.paintMode = !this.isSelected(coord.dayIndex, coord.hour);
		this.isDragging = true;
		this.dragStartCell = coord;
		this.dragEndCell = coord;
	}

	updateDrag(coord: CellCoord): void {
		if (!this.isDragging) return;
		this.dragEndCell = coord;
	}

	/** Commits the dragged rectangle and reports the new selection. */
	endDrag(): void {
		if (!this.isDragging) return;

		const rect = this.selectionRect;
		if (rect) {
			this.applyToKeys(rect);
		}

		this.resetGesture();
	}

	/** Abandons the drag without touching the selection (pointercancel, Escape, blur). */
	cancelDrag(): void {
		this.resetGesture();
	}

	/** Paints or erases a single cell — what a tap becomes when it never grew into a drag. */
	toggleCell(coord: CellCoord): void {
		this.beginDrag(coord);
		this.endDrag();
	}

	clearSelection(): void {
		this.resetGesture();
		this.setSelected({});
	}

	private applyToKeys(keys: string[]): void {
		const next = { ...this.selectedCells };
		for (const key of keys) {
			if (this.paintMode) {
				next[key] = true;
			} else {
				delete next[key];
			}
		}
		this.setSelected(next);
	}

	private resetGesture(): void {
		this.isDragging = false;
		this.dragStartCell = null;
		this.dragEndCell = null;
		this.pressingCell = null;
	}

	getSelectedISOStrings(): string[] {
		return Object.keys(this.selectedCells).filter(
			(key) => this.selectedCells[key],
		);
	}

	getSelectedDates(): Date[] {
		return this.getSelectedISOStrings()
			.map(cellKeyToDate)
			.filter((d): d is Date => d !== null);
	}
}
