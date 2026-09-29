import { cellKey, getCellsInRect } from './grid-utils';
import type { CellCoord, CellVisualState, SelectedCells } from './types';

export interface TimeGridStateOptions {
	initialSelected?: SelectedCells;
	onSelectionChange?: (selected: SelectedCells) => void;
}

export class TimeGridState {
	selectedCells = $state<SelectedCells>({});
	isDragging = $state(false);
	paintMode = $state(true);
	dragStartCell = $state<CellCoord | null>(null);
	dragEndCell = $state<CellCoord | null>(null);
	unpaintingCells = $state<string[]>([]);

	private touchPaintedCells = new Set<string>();
	private onSelectionChange?: (selected: SelectedCells) => void;

	constructor(options?: TimeGridStateOptions) {
		if (options?.initialSelected) {
			this.selectedCells = { ...options.initialSelected };
		}
		this.onSelectionChange = options?.onSelectionChange;
	}

	setSelectedCells(cells: SelectedCells): void {
		this.selectedCells = { ...cells };
	}

	private notifyChange(): void {
		this.onSelectionChange?.(this.selectedCells);
	}

	selectionRect = $derived.by(() => {
		if (!this.dragStartCell || !this.dragEndCell) return null;
		return getCellsInRect(this.dragStartCell, this.dragEndCell);
	});

	selectedCount = $derived(Object.keys(this.selectedCells).length);

	isSelected(dayIndex: number, hour: number): boolean {
		return !!this.selectedCells[cellKey(dayIndex, hour)];
	}

	isInDragSelection(dayIndex: number, hour: number): boolean {
		return this.selectionRect?.includes(cellKey(dayIndex, hour)) ?? false;
	}

	getCellVisualState(dayIndex: number, hour: number): CellVisualState {
		const key = cellKey(dayIndex, hour);

		if (this.isInDragSelection(dayIndex, hour)) {
			return this.paintMode ? 'actively-painting' : 'actively-unpainting';
		}

		if (this.unpaintingCells.includes(key)) {
			return 'actively-unpainting';
		}

		if (this.selectedCells[key]) {
			return 'painted';
		}

		return 'idle';
	}

	startMouseDrag(coord: CellCoord): void {
		const key = cellKey(coord.dayIndex, coord.hour);
		this.isDragging = true;
		this.paintMode = !this.selectedCells[key];
		this.dragStartCell = coord;
		this.dragEndCell = coord;
	}

	updateMouseDrag(coord: CellCoord): void {
		if (!this.isDragging) return;
		this.dragEndCell = coord;
	}

	endMouseDrag(): void {
		if (!this.isDragging) return;

		if (this.selectionRect) {
			const next = { ...this.selectedCells };
			for (const key of this.selectionRect) {
				if (this.paintMode) {
					next[key] = true;
				} else {
					delete next[key];
				}
			}
			this.selectedCells = next;
			this.notifyChange();
		}

		this.isDragging = false;
		this.dragStartCell = null;
		this.dragEndCell = null;
	}

	startTouchDrag(coord: CellCoord): void {
		const key = cellKey(coord.dayIndex, coord.hour);
		this.isDragging = true;
		this.paintMode = !this.selectedCells[key];
		this.touchPaintedCells.clear();
		this.unpaintingCells = [];

		if (this.paintMode) {
			this.selectedCells = { ...this.selectedCells, [key]: true };
		} else {
			const next = { ...this.selectedCells };
			delete next[key];
			this.selectedCells = next;
			this.unpaintingCells = [key];
		}
		this.touchPaintedCells.add(key);
		this.notifyChange();
	}

	updateTouchDrag(coord: CellCoord): void {
		if (!this.isDragging) return;

		const key = cellKey(coord.dayIndex, coord.hour);
		if (!this.touchPaintedCells.has(key)) {
			if (this.paintMode) {
				this.selectedCells = { ...this.selectedCells, [key]: true };
			} else {
				const next = { ...this.selectedCells };
				delete next[key];
				this.selectedCells = next;
				this.unpaintingCells = [...this.unpaintingCells, key];
			}
			this.touchPaintedCells.add(key);
			this.notifyChange();
		}
	}

	endTouchDrag(): void {
		this.isDragging = false;
		this.touchPaintedCells.clear();
		this.unpaintingCells = [];
	}

	clearSelection(): void {
		this.selectedCells = {};
		this.unpaintingCells = [];
		this.dragStartCell = null;
		this.dragEndCell = null;
		this.isDragging = false;
		this.notifyChange();
	}
}
