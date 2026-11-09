const CELL_WIDTH = 8;
const CELL_HEIGHT = 13;
const FRAME_INTERVAL = 1000 / 30;
const RAMP = ".:;=+*#%@";
const LANES = [-0.31, -0.155, 0, 0.155, 0.31];

/** Five loose streams settle onto the same line. This is a metaphor, not event data. */
export function createAvailabilityField(canvas: HTMLCanvasElement) {
	const context = canvas.getContext("2d");
	if (!context) return { destroy: () => {} };
	const ctx = context;
	const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const pointerDevice = window.matchMedia("(hover: hover) and (pointer: fine)");
	let width = 0;
	let height = 0;
	let frame = 0;
	let previousFrame = 0;
	let elapsed = 0;
	let lastTime = 0;
	let visible = true;
	let disposed = false;
	let pointer = { x: -1000, y: -1000 };
	let lens = { x: -1000, y: -1000 };
	let palette: string[] = [];
	let font = "";

	function draw(time: number) {
		ctx.clearRect(0, 0, width, height);
		ctx.font = font;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		const columns = Math.ceil(width / CELL_WIDTH);
		const rows = Math.ceil(height / CELL_HEIGHT);
		const amplitude = Math.min(height * 1.35, 640);
		for (let column = 0; column < columns; column++) {
			const x = column * CELL_WIDTH + CELL_WIDTH / 2;
			const progress = x / width;
			const merge = Math.min(1, Math.max(0, (progress - 0.08) / 0.74));
			const envelope = (1 - merge) ** 1.55;
			const edge = Math.min(1, progress * 9) * Math.min(1, (1 - progress) * 12);
			const centers = LANES.map((lane, index) => {
				const wave = Math.sin(progress * 10.5 - time * 0.5 + index * 1.8) * 27;
				return height * 0.5 + (lane * amplitude + wave) * envelope;
			});
			for (let row = 0; row < rows; row++) {
				const y = row * CELL_HEIGHT + CELL_HEIGHT / 2;
				const lensDistance = Math.hypot(x - lens.x, y - lens.y);
				const influence = Math.exp(-(lensDistance * lensDistance) / 9000);
				const bend = (y - lens.y) * influence * 0.35;
				let density = 0;
				for (let lane = 0; lane < centers.length; lane++) {
					const distance = Math.abs(y + bend - centers[lane]);
					const thickness = (9 + 8 * (1 - merge)) * (lane === 2 ? 1.15 : 1);
					const strand = Math.exp(
						-(distance * distance) / (thickness * thickness),
					);
					density = Math.max(density, strand);
				}
				const pulse = 0.72 + 0.28 * Math.sin(progress * 22 - time * 1.5);
				const grain = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
				const noise = grain - Math.floor(grain);
				const intensity = density * edge * pulse + influence * density * 0.28;
				if (intensity < 0.035) continue;
				const character = Math.min(
					RAMP.length - 1,
					Math.floor(intensity * (RAMP.length - 1)),
				);
				const tint = Math.min(
					palette.length - 1,
					Math.floor(intensity * palette.length),
				);
				ctx.fillStyle = palette[tint];
				ctx.globalAlpha = Math.min(1, edge * (0.5 + intensity * 0.7));
				const glyph =
					progress > 0.82 && intensity > 0.4
						? "="
						: RAMP[Math.max(0, character - (noise > 0.85 ? 1 : 0))];
				ctx.fillText(glyph, x, y);
			}
		}
		ctx.globalAlpha = 1;
	}

	function tick(now: number) {
		frame = 0;
		if (disposed || motion.matches || !visible || document.hidden) return;
		if (now - previousFrame >= FRAME_INTERVAL) {
			elapsed += lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
			lastTime = now;
			previousFrame = now;
			lens.x += (pointer.x - lens.x) * 0.18;
			lens.y += (pointer.y - lens.y) * 0.18;
			draw(elapsed);
		}
		frame = requestAnimationFrame(tick);
	}

	function syncPlayback() {
		cancelAnimationFrame(frame);
		frame = 0;
		lastTime = 0;
		if (disposed) return;
		if (motion.matches) {
			lens = { x: -1000, y: -1000 };
			draw(0);
		} else if (visible && !document.hidden) {
			frame = requestAnimationFrame(tick);
		}
	}

	function resize() {
		if (disposed) return;
		const bounds = canvas.getBoundingClientRect();
		width = bounds.width;
		height = bounds.height;
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(width * pixelRatio);
		canvas.height = Math.round(height * pixelRatio);
		ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		const styles = getComputedStyle(canvas);
		palette = [1, 2, 3, 4, 5].map((level) =>
			styles.getPropertyValue(`--color-glyph-${level}`).trim(),
		);
		font = `11px ${styles.getPropertyValue("--font-outlier").trim()}`;
		draw(motion.matches ? 0 : elapsed);
		canvas.dataset.ready = "true";
	}

	function movePointer(event: PointerEvent) {
		if (
			!pointerDevice.matches ||
			motion.matches ||
			event.pointerType === "touch"
		)
			return;
		const bounds = canvas.getBoundingClientRect();
		pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
		if (lens.x === -1000) lens = { ...pointer };
	}

	function resetPointer() {
		pointer = { x: -1000, y: -1000 };
	}

	const resizeObserver = new ResizeObserver(resize);
	const intersection = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		syncPlayback();
	});
	resizeObserver.observe(canvas);
	intersection.observe(canvas);
	canvas.addEventListener("pointermove", movePointer);
	canvas.addEventListener("pointerleave", resetPointer);
	document.addEventListener("visibilitychange", syncPlayback);
	motion.addEventListener("change", syncPlayback);
	resize();
	syncPlayback();
	void document.fonts.ready.then(() => {
		if (!disposed) resize();
	});

	return {
		destroy() {
			disposed = true;
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			intersection.disconnect();
			canvas.removeEventListener("pointermove", movePointer);
			canvas.removeEventListener("pointerleave", resetPointer);
			document.removeEventListener("visibilitychange", syncPlayback);
			motion.removeEventListener("change", syncPlayback);
		},
	};
}
