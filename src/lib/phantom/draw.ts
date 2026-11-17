/**
 * Canvas helpers for the demos. Images are produced at phantom resolution and
 * blitted with smoothing onto a larger display canvas.
 */

let scratch: HTMLCanvasElement | null = null;

function scratchCanvas(w: number, h: number) {
	if (!scratch) scratch = document.createElement('canvas');
	if (scratch.width !== w) scratch.width = w;
	if (scratch.height !== h) scratch.height = h;
	return scratch;
}

/** Draw an ImageData into a rect of the target canvas, scaled with smoothing. */
export function blit(
	ctx: CanvasRenderingContext2D,
	img: ImageData,
	dx: number,
	dy: number,
	dw: number,
	dh: number
) {
	const s = scratchCanvas(img.width, img.height);
	const sctx = s.getContext('2d')!;
	sctx.putImageData(img, 0, 0);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(s, 0, 0, img.width, img.height, dx, dy, dw, dh);
}

/** Small mono label in the corner of a panel. */
export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = 'rgba(255,255,255,0.85)') {
	ctx.save();
	ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
	ctx.fillStyle = color;
	ctx.textBaseline = 'top';
	ctx.fillText(text, x, y);
	ctx.restore();
}

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number, fill = '#0b1f2e') {
	ctx.fillStyle = fill;
	ctx.fillRect(0, 0, w, h);
}

/** Resolve a device-pixel-ratio aware context for a canvas with logical size w×h. */
export function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	canvas.width = Math.round(w * dpr);
	canvas.height = Math.round(h * dpr);
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	return ctx;
}
