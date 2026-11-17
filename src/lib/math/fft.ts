/**
 * Minimal in-place radix-2 FFT for square images whose side is a power of two.
 * Enough for k-space demos; not meant for production reconstruction.
 */
export function fft1d(re: Float64Array, im: Float64Array, inverse = false) {
	const n = re.length;
	// bit reversal
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			[re[i], re[j]] = [re[j], re[i]];
			[im[i], im[j]] = [im[j], im[i]];
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = ((inverse ? 2 : -2) * Math.PI) / len;
		const wRe = Math.cos(ang);
		const wIm = Math.sin(ang);
		for (let i = 0; i < n; i += len) {
			let curRe = 1;
			let curIm = 0;
			const half = len >> 1;
			for (let j = 0; j < half; j++) {
				const a = i + j;
				const b = a + half;
				const tRe = re[b] * curRe - im[b] * curIm;
				const tIm = re[b] * curIm + im[b] * curRe;
				re[b] = re[a] - tRe;
				im[b] = im[a] - tIm;
				re[a] += tRe;
				im[a] += tIm;
				const nRe = curRe * wRe - curIm * wIm;
				curIm = curRe * wIm + curIm * wRe;
				curRe = nRe;
			}
		}
	}
	if (inverse) {
		for (let i = 0; i < n; i++) {
			re[i] /= n;
			im[i] /= n;
		}
	}
}

/** 2D FFT of an n×n image (row-major), in place. */
export function fft2d(re: Float64Array, im: Float64Array, n: number, inverse = false) {
	const rowRe = new Float64Array(n);
	const rowIm = new Float64Array(n);
	for (let y = 0; y < n; y++) {
		rowRe.set(re.subarray(y * n, y * n + n));
		rowIm.set(im.subarray(y * n, y * n + n));
		fft1d(rowRe, rowIm, inverse);
		re.set(rowRe, y * n);
		im.set(rowIm, y * n);
	}
	for (let x = 0; x < n; x++) {
		for (let y = 0; y < n; y++) {
			rowRe[y] = re[y * n + x];
			rowIm[y] = im[y * n + x];
		}
		fft1d(rowRe, rowIm, inverse);
		for (let y = 0; y < n; y++) {
			re[y * n + x] = rowRe[y];
			im[y * n + x] = rowIm[y];
		}
	}
}

/** Swap quadrants so that zero frequency sits at the centre. Self-inverse for even n. */
export function fftshift2d(a: Float64Array, n: number) {
	const h = n >> 1;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < n; x++) {
			const x2 = (x + h) % n;
			const i = y * n + x;
			const j = (y + h) * n + x2;
			const t = a[i];
			a[i] = a[j];
			a[j] = t;
		}
	}
}
