/** Otsu's threshold on a float array, ignoring non-finite values. Returns the threshold intensity. */
export function otsuThreshold(data: ArrayLike<number>, nBins = 256): number {
	let lo = Infinity;
	let hi = -Infinity;
	for (let i = 0; i < data.length; i++) {
		const v = data[i];
		if (!Number.isFinite(v)) continue;
		if (v < lo) lo = v;
		if (v > hi) hi = v;
	}
	if (!(hi > lo)) return lo;
	const hist = new Float64Array(nBins);
	const scale = (nBins - 1) / (hi - lo);
	let total = 0;
	for (let i = 0; i < data.length; i++) {
		const v = data[i];
		if (!Number.isFinite(v)) continue;
		hist[Math.round((v - lo) * scale)]++;
		total++;
	}
	let sum = 0;
	for (let b = 0; b < nBins; b++) sum += b * hist[b];
	let sumB = 0;
	let wB = 0;
	let best = 0;
	let bestBin = 0;
	for (let b = 0; b < nBins; b++) {
		wB += hist[b];
		if (wB === 0) continue;
		const wF = total - wB;
		if (wF === 0) break;
		sumB += b * hist[b];
		const mB = sumB / wB;
		const mF = (sum - sumB) / wF;
		const between = wB * wF * (mB - mF) ** 2;
		if (between > best) {
			best = between;
			bestBin = b;
		}
	}
	return lo + bestBin / scale;
}

/** Percentile of a numeric array (copies and sorts). */
export function percentile(data: ArrayLike<number>, p: number): number {
	const arr = Float32Array.from(data as ArrayLike<number>).sort();
	if (!arr.length) return 0;
	const idx = Math.min(arr.length - 1, Math.max(0, Math.round((p / 100) * (arr.length - 1))));
	return arr[idx];
}
