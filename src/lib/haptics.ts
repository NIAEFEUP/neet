/**
 * Tiny web-haptics helper.
 *
 * Android/Chromium: `navigator.vibrate` gives real haptic ticks.
 * iOS Safari: no Vibration API. The native switch tick only fires on a direct
 * tap of a switch, not during a drag, so this is a silent no-op there.
 * Desktop: silent no-op.
 */
const TICK_INTERVAL_MS = 32;

let lastTickAt = 0;

function vibrate(pattern: number | number[]) {
	if (typeof window === "undefined" || typeof navigator === "undefined") return;
	if (typeof navigator.vibrate !== "function") return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	try {
		navigator.vibrate(pattern);
	} catch {
		// A browser can reject vibration when the page has no activation.
	}
}

/** A short tap for grabbing the control or pressing Reset. */
export function hapticTap() {
	vibrate(14);
}

/** A light detent tick when a drag crosses a whole hour. */
export function hapticTick() {
	const now = performance.now();
	if (now - lastTickAt < TICK_INTERVAL_MS) return;

	lastTickAt = now;
	vibrate(10);
}
