/** Tiny colormap helpers for canvas demos. All return [r, g, b] in 0–255. */

export type RGB = [number, number, number];

export function gray(t: number): RGB {
	const v = Math.round(clamp01(t) * 255);
	return [v, v, v];
}

/** Blue → teal → yellow, perceptually ordered enough for scalar maps. */
export function viridis(t: number): RGB {
	t = clamp01(t);
	const stops: RGB[] = [
		[68, 1, 84],
		[59, 82, 139],
		[33, 145, 140],
		[94, 201, 98],
		[253, 231, 37]
	];
	return lerpStops(stops, t);
}

/** Black → red → yellow → white, the classic "hot" used for FA. */
export function hot(t: number): RGB {
	t = clamp01(t);
	const stops: RGB[] = [
		[0, 0, 0],
		[180, 20, 10],
		[250, 160, 20],
		[255, 255, 255]
	];
	return lerpStops(stops, t);
}

/** Diverging blue–white–red for signed statistics. */
export function coolwarm(t: number): RGB {
	t = clamp01(t);
	const stops: RGB[] = [
		[59, 76, 192],
		[221, 221, 221],
		[180, 4, 38]
	];
	return lerpStops(stops, t);
}

/** Direction-encoded color: |x| → red, |y| → green, |z| → blue, scaled by FA. */
export function dirColor(x: number, y: number, z: number, fa: number): RGB {
	return [
		Math.round(Math.min(1, Math.abs(x)) * fa * 255),
		Math.round(Math.min(1, Math.abs(y)) * fa * 255),
		Math.round(Math.min(1, Math.abs(z)) * fa * 255)
	];
}

export const labelColors: RGB[] = [
	[0, 0, 0],
	[64, 131, 212], // CSF
	[214, 143, 54], // GM
	[236, 236, 236], // WM
	[196, 72, 102]
];

function lerpStops(stops: RGB[], t: number): RGB {
	const pos = t * (stops.length - 1);
	const i = Math.min(stops.length - 2, Math.floor(pos));
	const f = pos - i;
	const a = stops[i];
	const b = stops[i + 1];
	return [
		Math.round(a[0] + (b[0] - a[0]) * f),
		Math.round(a[1] + (b[1] - a[1]) * f),
		Math.round(a[2] + (b[2] - a[2]) * f)
	];
}

export function clamp01(v: number) {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Write a scalar field into an ImageData using a colormap and [lo, hi] window. */
export function paintScalar(
	img: ImageData,
	field: ArrayLike<number>,
	lo: number,
	hi: number,
	cmap: (t: number) => RGB = gray,
	mask?: ArrayLike<number>
) {
	const d = img.data;
	const range = hi - lo || 1;
	for (let i = 0, p = 0; i < field.length; i++, p += 4) {
		if (mask && !mask[i]) {
			d[p] = 10;
			d[p + 1] = 14;
			d[p + 2] = 20;
			d[p + 3] = 255;
			continue;
		}
		const [r, g, b] = cmap((field[i] - lo) / range);
		d[p] = r;
		d[p + 1] = g;
		d[p + 2] = b;
		d[p + 3] = 255;
	}
}
