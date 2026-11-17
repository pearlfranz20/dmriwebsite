import { fitVoxel, makeDtiFitter } from '$lib/math/dti';
import { otsuThreshold } from './otsu';
import type { DtiRequest, DtiResult, Progress, WorkerError } from './types';

/**
 * Diffusion tensor fit in a worker.
 *
 * Voxel layout assumption: `img` is frame-major, i.e. img[f * nVox + k] is
 * voxel k of frame f, with x the fastest-varying index. This matches how
 * NiiVue stores 4D volumes (it reads frame f starting at f * nVox3D).
 */
self.onmessage = (ev: MessageEvent<DtiRequest>) => {
	const msg = ev.data;
	if (msg.type !== 'dti') return;
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

function run(req: DtiRequest) {
	const t0 = performance.now();
	const { img, dims, nFrames, bvals, bvecs } = req;
	const nVox = dims[0] * dims[1] * dims[2];
	if (img.length !== nVox * nFrames) {
		throw new Error(`Voxel count mismatch: ${img.length} values for ${nVox} voxels × ${nFrames} frames.`);
	}
	if (bvals.length !== nFrames || bvecs.length !== nFrames * 3) {
		throw new Error(`Expected ${nFrames} b-values and directions, got ${bvals.length} / ${bvecs.length / 3}.`);
	}

	// 1. mean b0 and brain mask
	post(0.05, 'Averaging b=0 volumes');
	const b0idx: number[] = [];
	for (let f = 0; f < nFrames; f++) if (bvals[f] < 50) b0idx.push(f);
	if (!b0idx.length) throw new Error('No b=0 volume found (need at least one b-value below 50).');
	if (nFrames - b0idx.length < 6) throw new Error('A tensor fit needs at least 6 diffusion-weighted directions.');

	const meanB0 = new Float32Array(nVox);
	for (const f of b0idx) {
		const base = f * nVox;
		for (let k = 0; k < nVox; k++) meanB0[k] += img[base + k];
	}
	for (let k = 0; k < nVox; k++) meanB0[k] /= b0idx.length;

	post(0.12, 'Thresholding mean b=0 (Otsu)');
	const thr = otsuThreshold(meanB0);
	const mask = new Uint8Array(nVox);
	let maskCount = 0;
	for (let k = 0; k < nVox; k++) {
		if (meanB0[k] > thr && meanB0[k] > 0) {
			mask[k] = 1;
			maskCount++;
		}
	}
	if (!maskCount) throw new Error('The brain mask is empty; the mean b=0 image may be blank.');

	// 2. tensor fit
	post(0.15, 'Fitting tensors');
	const fitter = makeDtiFitter(bvals, bvecs);
	const fa = new Float32Array(nVox);
	const md = new Float32Array(nVox);
	const rgb = new Uint8Array(nVox * 3);
	const signals = new Float64Array(nFrames);
	let sumFa = 0;
	let sumMd = 0;
	let done = 0;
	const reportEvery = Math.max(1, Math.floor(maskCount / 40));

	for (let k = 0; k < nVox; k++) {
		if (!mask[k]) continue;
		for (let f = 0; f < nFrames; f++) signals[f] = img[f * nVox + k];
		const m = fitVoxel(fitter, signals);
		const faV = Number.isFinite(m.fa) ? m.fa : 0;
		const mdV = Number.isFinite(m.md) ? Math.max(0, m.md) : 0;
		fa[k] = faV;
		md[k] = mdV;
		rgb[k * 3] = Math.round(Math.min(1, Math.abs(m.e1[0])) * faV * 255);
		rgb[k * 3 + 1] = Math.round(Math.min(1, Math.abs(m.e1[1])) * faV * 255);
		rgb[k * 3 + 2] = Math.round(Math.min(1, Math.abs(m.e1[2])) * faV * 255);
		sumFa += faV;
		sumMd += mdV;
		done++;
		if (done % reportEvery === 0) post(0.15 + 0.8 * (done / maskCount), 'Fitting tensors');
	}

	post(1, 'Done');
	const result: DtiResult = {
		type: 'dti-done',
		fa,
		md,
		rgb,
		mask,
		maskCount,
		meanFa: sumFa / maskCount,
		meanMd: sumMd / maskCount,
		ms: performance.now() - t0
	};
	self.postMessage(result, { transfer: [fa.buffer, md.buffer, rgb.buffer, mask.buffer] });
}
