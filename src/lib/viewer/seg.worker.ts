import { otsuThreshold, percentile } from './otsu';
import type { Progress, SegRequest, SegResult, WorkerError } from './types';

/** Otsu foreground mask followed by 3-class k-means on intensity. */
self.onmessage = (ev: MessageEvent<SegRequest>) => {
	const msg = ev.data;
	if (msg.type !== 'seg') return;
	try {
		run(msg);
	} catch (err) {
		const out: WorkerError = { type: 'error', message: err instanceof Error ? err.message : String(err) };
		self.postMessage(out);
	}
};

function post(value: number, label: string) {
	const p: Progress = { type: 'progress', value, label };
	self.postMessage(p);
}

function run(req: SegRequest) {
	const t0 = performance.now();
	const { img, dims, pixDims } = req;
	const nVox = dims[0] * dims[1] * dims[2];
	if (img.length < nVox) throw new Error('Image is smaller than its header claims.');

	post(0.1, 'Finding foreground (Otsu)');
	const threshold = otsuThreshold(img.subarray(0, nVox));
	const idx: number[] = [];
	for (let k = 0; k < nVox; k++) if (img[k] > threshold) idx.push(k);
	if (idx.length < 100) throw new Error('Almost nothing is above the foreground threshold.');

	const vals = new Float32Array(idx.length);
	for (let i = 0; i < idx.length; i++) vals[i] = img[idx[i]];

	post(0.25, 'Initialising classes');
	const means: [number, number, number] = [percentile(vals, 25), percentile(vals, 50), percentile(vals, 75)];
	const assign = new Uint8Array(vals.length);

	for (let it = 0; it < 20; it++) {
		const sums = [0, 0, 0];
		const counts = [0, 0, 0];
		for (let i = 0; i < vals.length; i++) {
			const v = vals[i];
			let best = 0;
			let bestD = Math.abs(v - means[0]);
			for (let c = 1; c < 3; c++) {
				const d = Math.abs(v - means[c]);
				if (d < bestD) {
					bestD = d;
					best = c;
				}
			}
			assign[i] = best;
			sums[best] += v;
			counts[best]++;
		}
		let moved = 0;
		for (let c = 0; c < 3; c++) {
			if (!counts[c]) continue;
			const m = sums[c] / counts[c];
			moved += Math.abs(m - means[c]);
			means[c] = m;
		}
		post(0.25 + 0.6 * ((it + 1) / 20), `k-means iteration ${it + 1}`);
		if (moved < 1e-6) break;
	}

	// order classes by mean intensity so label 1 is darkest
	const order = [0, 1, 2].sort((a, b) => means[a] - means[b]);
	const rank = [0, 0, 0];
	order.forEach((c, r) => (rank[c] = r));

	const labels = new Uint8Array(nVox);
	const counts: [number, number, number] = [0, 0, 0];
	for (let i = 0; i < idx.length; i++) {
		const r = rank[assign[i]];
		labels[idx[i]] = r + 1;
		counts[r]++;
	}
	const voxMl = (pixDims[0] * pixDims[1] * pixDims[2]) / 1000;
	const volumesMl: [number, number, number] = [counts[0] * voxMl, counts[1] * voxMl, counts[2] * voxMl];
	const sortedMeans: [number, number, number] = [means[order[0]], means[order[1]], means[order[2]]];

	post(0.9, 'Building histogram');
	const nBins = 64;
	const lo = threshold;
	const hi = percentile(vals, 99.5);
	const bins = new Float32Array(nBins);
	const scale = (nBins - 1) / Math.max(hi - lo, 1e-9);
	for (let i = 0; i < vals.length; i++) {
		const b = Math.min(nBins - 1, Math.max(0, Math.round((vals[i] - lo) * scale)));
		bins[b]++;
	}

	post(1, 'Done');
	const result: SegResult = {
		type: 'seg-done',
		labels,
		counts,
		volumesMl,
		means: sortedMeans,
		histogram: { bins, lo, hi },
		threshold,
		ms: performance.now() - t0
	};
	self.postMessage(result, { transfer: [labels.buffer, bins.buffer] });
}
