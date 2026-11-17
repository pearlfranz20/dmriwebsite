<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { makePhantom, synthesizeDwi, TISSUE } from '$lib/phantom/phantom2d';
	import { fibonacciSphere, mulberry32 } from '$lib/math/rng';
	import { makeDtiFitter, fitVoxel } from '$lib/math/dti';
	import { blit, clear, label, setupCanvas } from '$lib/phantom/draw';
	import { paintScalar, gray } from '$lib/math/colormaps';

	let model = $state<'dti' | 'multi'>('dti');
	let step = $state(0.5);
	let angleThr = $state(35);
	let faThr = $state(0.2);
	let jitter = $state(0);
	let seeds = $state<{ x: number; y: number }[]>([
		{ x: 64, y: 32 },
		{ x: 38, y: 30 },
		{ x: 90, y: 30 },
		{ x: 38, y: 95 },
		{ x: 90, y: 95 }
	]);

	const ph = makePhantom(128);
	const n = ph.n;
	const nVox = n * n;
	const S = 520;

	// A clean, well-sampled DTI fit of the phantom gives the "DTI" peak field.
	const nDir = 32;
	const dirs = fibonacciSphere(nDir, true);
	const bvals = [0, ...Array(nDir).fill(1000)];
	const bvecs = new Float32Array((nDir + 1) * 3);
	bvecs.set([0, 0, 1], 0);
	bvecs.set(dirs, 3);
	const fitter = makeDtiFitter(bvals, bvecs);
	const data = synthesizeDwi(ph, bvals, bvecs, 0, 1);
	const faField = new Float32Array(nVox);
	const peakX = new Float32Array(nVox);
	const peakY = new Float32Array(nVox);
	{
		const sig = new Float32Array(nDir + 1);
		for (let k = 0; k < nVox; k++) {
			if (!ph.mask[k]) continue;
			for (let d = 0; d <= nDir; d++) sig[d] = data[d * nVox + k];
			const m = fitVoxel(fitter, sig);
			faField[k] = m.fa;
			// phantom y is up; canvas y is down
			peakX[k] = m.e1[0];
			peakY[k] = -m.e1[1];
		}
	}

	type Peak = [number, number];
	function peaksAt(k: number): Peak[] {
		if (model === 'dti') return [[peakX[k], peakY[k]]];
		const out: Peak[] = [[Math.cos(ph.theta1[k]), -Math.sin(ph.theta1[k])]];
		if (ph.nFib[k] === 2) out.push([Math.cos(ph.theta2[k]), -Math.sin(ph.theta2[k])]);
		return out;
	}

	let canvas: HTMLCanvasElement;
	const stats = $state({ count: 0, meanLen: 0 });

	function track(x0: number, y0: number, sx: number, sy: number, rnd: () => number): number[] {
		const pts = [x0, y0];
		let x = x0;
		let y = y0;
		let dx = sx;
		let dy = sy;
		const cosThr = Math.cos((angleThr * Math.PI) / 180);
		const jit = (jitter * Math.PI) / 180;
		for (let i = 0; i < 600; i++) {
			const xi = Math.round(x);
			const yi = Math.round(y);
			if (xi < 0 || yi < 0 || xi >= n || yi >= n) break;
			const k = yi * n + xi;
			if (!ph.mask[k] || ph.tissue[k] !== TISSUE.WM) break;
			if (faField[k] < faThr && model === 'dti') break;
			if (ph.nFib[k] === 0) break;
			// choose the peak closest to the incoming direction
			let best: Peak | null = null;
			let bestDot = -2;
			for (const p of peaksAt(k)) {
				const dot = p[0] * dx + p[1] * dy;
				const a = Math.abs(dot);
				if (a > bestDot) {
					bestDot = a;
					best = dot < 0 ? [-p[0], -p[1]] : p;
				}
			}
			if (!best || bestDot < cosThr) break;
			let nx = best[0];
			let ny = best[1];
			if (jit > 0) {
				const a = (rnd() - 0.5) * 2 * jit;
				const c = Math.cos(a);
				const s = Math.sin(a);
				[nx, ny] = [nx * c - ny * s, nx * s + ny * c];
			}
			dx = nx;
			dy = ny;
			x += dx * step;
			y += dy * step;
			pts.push(x, y);
		}
		return pts;
	}

	$effect(() => {
		// read reactive deps
		void model;
		void step;
		void angleThr;
		void faThr;
		void jitter;
		const rnd = mulberry32(99);
		const ctx = setupCanvas(canvas, S, S);
		clear(ctx, S, S);
		const bg = new ImageData(n, n);
		const dim = faField.map((v) => v * 0.55);
		paintScalar(bg, dim, 0, 1, gray, ph.mask);
		blit(ctx, bg, 0, 0, S, S);

		const px = S / n;
		let count = 0;
		let totalLen = 0;
		ctx.lineWidth = 1.2;
		ctx.lineCap = 'round';
		for (const sd of seeds) {
			for (let s = 0; s < 14; s++) {
				const x0 = sd.x + (rnd() - 0.5) * 5;
				const y0 = sd.y + (rnd() - 0.5) * 5;
				const k = Math.round(y0) * n + Math.round(x0);
				if (k < 0 || k >= nVox || !ph.mask[k]) continue;
				const p0 = peaksAt(k)[0];
				const a = track(x0, y0, p0[0], p0[1], rnd);
				const b = track(x0, y0, -p0[0], -p0[1], rnd);
				// join the two half-tracks into one polyline (reverse the first, keeping xy pairs intact)
				const fwd: number[] = [];
				for (let i = a.length - 2; i >= 0; i -= 2) fwd.push(a[i], a[i + 1]);
				const line = fwd.concat(b.slice(2));
				if (line.length < 8) continue;
				count++;
				totalLen += (line.length / 2) * step;
				for (let i = 2; i < line.length; i += 2) {
					const ddx = line[i] - line[i - 2];
					const ddy = line[i + 1] - line[i - 1];
					const l = Math.hypot(ddx, ddy) || 1;
					ctx.strokeStyle = `rgb(${Math.round((Math.abs(ddx) / l) * 255)}, ${Math.round((Math.abs(ddy) / l) * 255)}, 90)`;
					ctx.beginPath();
					ctx.moveTo(line[i - 2] * px, line[i - 1] * px);
					ctx.lineTo(line[i] * px, line[i + 1] * px);
					ctx.stroke();
				}
			}
			ctx.fillStyle = '#ffd27a';
			ctx.beginPath();
			ctx.arc(sd.x * px, sd.y * px, 3.5, 0, Math.PI * 2);
			ctx.fill();
		}
		stats.count = count;
		stats.meanLen = count ? (totalLen / count) * 2 : 0; // 2 mm voxels
		label(ctx, model === 'dti' ? 'single tensor per voxel' : 'multi-fiber peaks per voxel', 10, 10);
		label(ctx, 'click to add seeds', 10, S - 22, 'rgba(255,255,255,0.5)');
	});

	function addSeed(e: MouseEvent) {
		const r = canvas.getBoundingClientRect();
		const x = ((e.clientX - r.left) / r.width) * n;
		const y = ((e.clientY - r.top) / r.height) * n;
		seeds = [...seeds, { x, y }];
	}
</script>

<Demo
	title="Streamline tractography, step by step"
	caption="Start at a seed, read the fiber direction in that voxel, take a small step, repeat. Stop when the direction turns too sharply or anisotropy falls too low. With one tensor per voxel the streamlines die or jump where the arc crosses the vertical bundles. Switch to multi-fiber peaks and they pass through."
>
	<canvas bind:this={canvas} style="aspect-ratio: 1 / 1; cursor: crosshair" onclick={addSeed}></canvas>

	{#snippet controls()}
		<div class="seg">
			<button type="button" class:on={model === 'dti'} onclick={() => (model = 'dti')}>DTI</button>
			<button type="button" class:on={model === 'multi'} onclick={() => (model = 'multi')}>Multi-fiber</button>
		</div>
		<Slider label="Step size" bind:value={step} min={0.2} max={2} step={0.1} unit=" vox" format={(v) => v.toFixed(1)} />
		<Slider label="Max turning angle" bind:value={angleThr} min={10} max={90} step={1} unit="°" />
		<Slider label="FA threshold (DTI)" bind:value={faThr} min={0.05} max={0.6} step={0.01} format={(v) => v.toFixed(2)} />
		<Slider label="Probabilistic jitter" bind:value={jitter} min={0} max={30} step={1} unit="°" />
		<button type="button" class="reset" onclick={() => (seeds = seeds.slice(0, 5))}>Reset seeds</button>
	{/snippet}

	{#snippet readout()}
		<div>Streamlines: <b>{stats.count}</b></div>
		<div>Mean length: <b>{stats.meanLen.toFixed(0)} mm</b></div>
	{/snippet}
</Demo>

<style>
	.seg {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		overflow: hidden;
	}

	.seg button {
		font: 500 0.8rem var(--font-body);
		padding: 0.5rem;
		border: none;
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
	}

	.seg button.on {
		background: var(--ink);
		color: var(--paper);
	}

	.reset {
		font: 500 0.75rem var(--font-mono);
		padding: 0.45rem 0.7rem;
		border-radius: 6px;
		border: 1px solid var(--line-strong);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
		justify-self: start;
	}
</style>
