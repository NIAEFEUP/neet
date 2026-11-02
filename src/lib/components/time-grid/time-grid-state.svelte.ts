import { cellKey, cellKeyToDate, getCellsInRect } from "./grid-utils";
import type {
	CellCoord,
	CellMode,
	CellVisualState,
	SelectedCells,
} from "./types";

/**
 * Corner radius of the selection, in px. Rows are 36px tall, so this is
 * comfortably round without reaching the 18px that would make a single hour a
 * pill. Paired with `corner-shape: squircle` on the cell.
 */
const CELL_RADIUS_PX = 12;

export interface TimeGridStateOptions {
	/** Reads the externally-owned selection — the caller's bindable `selected`. */
	getSelected: () => SelectedCells;
	/** Writes it back. Called once per committed change, never per cell. */
	setSelected: (selected: SelectedCells) => void;
	/** The normalized day columns currently rendered. */
	getDays: () => Date[];
	/** The brush the guest is painting with right now. */
	getMode: () => CellMode;
}

/**
 * The in-flight gesture and its rendering state, shared by mouse, touch and pen.
 *
 * Every input drives the same model: a drag records a start and an end cell, the
 * rectangle between them is the selection, and the change is committed on
 * release. Whether that change paints or erases is decided by the rectangle
 * itself: if every cell in it already carries the active brush the drag erases,
 * and if even one cell differs it paints the whole block with the brush. Starting
 * inside a painted region and sweeping outward therefore adds the new hours
 * instead of deleting the old ones. Drags with no movement commit a single cell,
 * which is what makes a tap work.
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
	dragStartCell = $state<CellCoord | null>(null);
	dragEndCell = $state<CellCoord | null>(null);
	pressingCell = $state<CellCoord | null>(null);

	private getSelected: () => SelectedCells;
	private setSelected: (selected: SelectedCells) => void;
	private getDays: () => Date[];
	private getMode: () => CellMode;

	constructor(options: TimeGridStateOptions) {
		this.getSelected = options.getSelected;
		this.setSelected = options.setSelected;
		this.getDays = options.getDays;
		this.getMode = options.getMode;
	}

	get days(): Date[] {
		return this.getDays();
	}

	get selectedCells(): SelectedCells {
		return this.getSelected();
	}

	/** Any recorded mode counts, whichever brush painted it. */
	selectedCount = $derived(
		Object.values(this.selectedCells).filter(Boolean).length,
	);

	selectionRect = $derived.by(() => {
		if (!this.dragStartCell || !this.dragEndCell) return null;
		return getCellsInRect(this.dragStartCell, this.dragEndCell, this.days);
	});

	private selectionSet = $derived(new Set(this.selectionRect ?? []));

	/**
	 * A rectangle that is entirely in the active brush erases; one with a single
	 * cell in a different mode paints all of it. Checked against the committed
	 * selection, which does not change until release, so "already selected" always
	 * means "selected before this gesture".
	 */
	paintMode = $derived.by(() => {
		const rect = this.selectionRect;
		if (!rect?.length) return true;

		const mode = this.getMode();
		return !rect.every((key) => this.selectedCells[key] === mode);
	});

	/** Replaces the selection wholesale. */
	setSelectedCells(cells: SelectedCells): void {
		this.setSelected(cells);
	}

	private keyFor(dayIndex: number, hour: number): string | null {
		const day = this.days[dayIndex];
		return day ? cellKey(day, hour) : null;
	}

	getCellMode(dayIndex: number, hour: number): CellMode | null {
		const key = this.keyFor(dayIndex, hour);
		return key ? (this.selectedCells[key] ?? null) : null;
	}

	isSelected(dayIndex: number, hour: number): boolean {
		return this.getCellMode(dayIndex, hour) !== null;
	}

	isInDragSelection(dayIndex: number, hour: number): boolean {
		const key = this.keyFor(dayIndex, hour);
		return key ? this.selectionSet.has(key) : false;
	}

	isPressing(dayIndex: number, hour: number): boolean {
		return (
			this.pressingCell?.dayIndex === dayIndex &&
			this.pressingCell?.hour === hour
		);
	}

	getCellVisualState(dayIndex: number, hour: number): CellVisualState {
		if (this.isInDragSelection(dayIndex, hour)) {
			if (!this.paintMode) return "active-clearing";
			return this.getMode() === "available"
				? "active-available"
				: "active-maybe";
		}

		if (this.isPressing(dayIndex, hour)) {
			return "pressing";
		}

		const mode = this.getCellMode(dayIndex, hour);
		if (mode) return mode;

		return "idle";
	}

	/**
	 * Whether a cell is part of the visible filled region.
	 *
	 * Deliberately *not* the same as "will still be selected when the gesture
	 * commits". A cell being unpainted keeps a fill while the pointer is over it,
	 * so it has to count as part of the region — otherwise every cell under the
	 * pointer rounds off on its own and a run breaks into a stack of pills
	 * instead of one shape with a lighter section where the erase is happening.
	 */
	private isVisuallyFilled(dayIndex: number, hour: number): boolean {
		return (
			this.isSelected(dayIndex, hour) || this.isInDragSelection(dayIndex, hour)
		);
	}

	/**
	 * A CSS `border-radius` value for a cell, as corner radii in TL TR BR BL order.
	 *
	 * Rounding belongs to the region, not to the cell: a corner is only rounded
	 * when the hour above or below it is not filled, so a run of hours fuses into
	 * one shape.
	 *
	 * Horizontally, nothing merges. Each day is its own shape — a selection
	 * running across midnight is two blocks, not one — which is also what
	 * separates the columns, now that the grid has no vertical rules.
	 */
	getCellRadius(dayIndex: number, hour: number): string {
		const up = this.isVisuallyFilled(dayIndex, hour - 1);
		const down = this.isVisuallyFilled(dayIndex, hour + 1);

		const top = up ? 0 : CELL_RADIUS_PX;
		const bottom = down ? 0 : CELL_RADIUS_PX;

		return `${top}px ${top}px ${bottom}px ${bottom}px`;
	}

	/**
	 * Marks a cell as held, before the gesture is known to be a drag. Cleared on
	 * release, on cancel, and as soon as the finger moves far enough that the
	 * gesture is clearly a scroll.
	 */
	setPressing(coord: CellCoord | null): void {
		this.pressingCell = coord;
	}

	/** Starts a drag at `coord`. Paint or erase follows from the rectangle it grows into. */
	beginDrag(coord: CellCoord): void {
		this.pressingCell = null;
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
		if (rect?.length) this.applyToKeys(rect);

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

	/**
	 * Applies the active brush or clears every key, and reports only when at
	 * least one cell actually changed. A drag that merely crosses cells already
	 * in the brush must not look like an edit to the caller.
	 */
	private applyToKeys(keys: string[]): void {
		const next = { ...this.selectedCells };
		const mode = this.getMode();
		let changed = false;

		for (const key of keys) {
			if (this.paintMode) {
				if (next[key] !== mode) {
					next[key] = mode;
					changed = true;
				}
			} else if (next[key]) {
				delete next[key];
				changed = true;
			}
		}

		if (changed) this.setSelected(next);
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
