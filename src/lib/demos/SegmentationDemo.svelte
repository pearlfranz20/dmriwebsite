<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { makePhantom, relaxSignal, type TissueId } from '$lib/phantom/phantom2d';
	import { gaussian, mulberry32 } from '$lib/math/rng';
	import { blit, clear, label, setupCanvas } from '$lib/phantom/draw';
	import { paintScalar, gray, labelColors } from '$lib/math/colormaps';

	let noise = $state(0.03);
	let bias = $state(0.4);
	let corrected = $state(false);

	const ph = makePhantom(128);
	const n = ph.n;
	const nVox = n * n;
	const W = 520;
	const H = 268;
	const P = 240;
	const gap = (W - 2 * P) / 3;

	// T1-weighted base image
	const base = new Float32Array(nVox);
	{
		const sig = [0, 1, 2, 3].map((t) => relaxSignal(t as TissueId, 500, 15, null));
		for (let k = 0; k < nVox; k++) base[k] = sig[ph.tissue[k]];
	}

	let canvas: HTMLCanvasElement;
	const dice = $state({ csf: 0, gm: 0, wm: 0 });

	$effect(() => {
		const g = gaussian(mulberry32(17));
		const img = new Float32Array(nVox);
		for (let j = 0; j < n; j++) {
			for (let i = 0; i < n; i++) {
				const k = j * n + i;
				const x = (i / n) * 2 - 1;
				const y = (j / n) * 2 - 1;
				// smooth multiplicative field, like coil sensitivity
				const field = 1 + bias * (0.45 * x + 0.3 * y + 0.25 * x * y);
				img[k] = base[k] * (corrected ? 1 : field) + noise * g();
			}
		}

		// 3-class k-means inside the head mask
		const vals: number[] = [];
		for (let k = 0; k < nVox; k++) if (ph.mask[k]) vals.push(img[k]);
		vals.sort((a, b) => a - b);
		let centers = [vals[Math.floor(vals.length * 0.15)], vals[Math.floor(vals.length * 0.5)], vals[Math.floor(vals.length * 0.85)]];
		const labelsOut = new Uint8Array(nVox);
		for (let it = 0; it < 15; it++) {
			const sum = [0, 0, 0];
			const cnt = [0, 0, 0];
			for (let k = 0; k < nVox; k++) {
				if (!ph.mask[k]) continue;
				let best = 0;
				let bd = Infinity;
				for (let c = 0; c < 3; c++) {
					const d = Math.abs(img[k] - centers[c]);
					if (d < bd) {
						bd = d;
						best = c;
					}
				}
				labelsOut[k] = best + 1;
				sum[best] += img[k];
				cnt[best]++;
			}
			centers = centers.map((c, i) => (cnt[i] ? sum[i] / cnt[i] : c));
		}
		// classes are sorted by intensity: on T1w that is CSF < GM < WM, matching tissue ids 1..3

		const inter = [0, 0, 0, 0];
		const sizeA = [0, 0, 0, 0];
		const sizeB = [0, 0, 0, 0];
		for (let k = 0; k < nVox; k++) {
			if (!ph.mask[k]) continue;
			const t = ph.tissue[k];
			const l = labelsOut[k];
			sizeA[t]++;
			sizeB[l]++;
			if (t === l) inter[t]++;
		}
		const d = (t: number) => (2 * inter[t]) / (sizeA[t] + sizeB[t] || 1);
		dice.csf = d(1);
		dice.gm = d(2);
		dice.wm = d(3);

		const ctx = setupCanvas(canvas, W, H);
		clear(ctx, W, H);
		const im = new ImageData(n, n);
		paintScalar(im, img, 0, Math.max(...centers) * 1.3, gray);
		const lab = new ImageData(n, n);
		for (let k = 0; k < nVox; k++) {
			const c = labelColors[labelsOut[k]];
			lab.data[k * 4] = c[0];
			lab.data[k * 4 + 1] = c[1];
			lab.data[k * 4 + 2] = c[2];
			lab.data[k * 4 + 3] = 255;
		}
		const top = (H - P) / 2;
		blit(ctx, im, gap, top, P, P);
		blit(ctx, lab, 2 * gap + P, top, P, P);
		label(ctx, corrected ? 'T1w · bias corrected' : 'T1w · raw', gap + 8, top + 8);
		label(ctx, 'k-means, 3 classes', 2 * gap + P + 8, top + 8);
	});
</script>

<Demo
	title="Segmenting tissue by intensity, and why bias correction comes first"
	caption="Classifying voxels by brightness alone works when each tissue has one brightness. A receive-coil bias field makes one side of the brain brighter than the other, so white matter on the dark side gets labelled gray. Correct the field and the same simple classifier recovers."
>
	<canvas bind:this={canvas} style="aspect-ratio: {W} / {H}"></canvas>

	{#snippet controls()}
		<Slider label="Bias field strength" bind:value={bias} min={0} max={0.8} step={0.05} format={(v) => v.toFixed(2)} />
		<Slider label="Noise" bind:value={noise} min={0} max={0.12} step={0.005} format={(v) => v.toFixed(3)} />
		<label class="check">
			<input type="checkbox" bind:checked={corrected} />
			<span>Apply bias-field correction</span>
		</label>
	{/snippet}

	{#snippet readout()}
		<div>Dice vs truth · CSF <b>{dice.csf.toFixed(2)}</b> · GM <b>{dice.gm.toFixed(2)}</b> · WM <b>{dice.wm.toFixed(2)}</b></div>
	{/snippet}
</Demo>

<style>
	.check {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		font-size: 0.85rem;
		color: var(--ink-2);
		font-weight: 500;
	}

	.check input {
		accent-color: var(--accent);
		width: 1rem;
		height: 1rem;
	}
</style>
