<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { makePhantom, relaxSignal, type TissueId } from '$lib/phantom/phantom2d';
	import { blit, clear, label, setupCanvas } from '$lib/phantom/draw';

	// the "unknown" true misalignment of the moving image
	const truth = { tx: 9, ty: -6, rot: 14 };

	let tx = $state(0);
	let ty = $state(0);
	let rot = $state(0);
	let running = $state(false);
	let iterations = $state(0);

	const ph = makePhantom(128);
	const n = ph.n;
	const nVox = n * n;
	const W = 520;
	const H = 268;
	const P = 240;
	const gap = (W - 2 * P) / 3;

	const fixed = new Float32Array(nVox);
	{
		const sig = [0, 1, 2, 3].map((t) => relaxSignal(t as TissueId, 500, 15, null));
		for (let k = 0; k < nVox; k++) fixed[k] = sig[ph.tissue[k]];
	}
	const fmax = Math.max(...fixed);

	function sample(src: Float32Array, x: number, y: number) {
		if (x < 0 || y < 0 || x > n - 1 || y > n - 1) return 0;
		const x0 = Math.floor(x);
		const y0 = Math.floor(y);
		const x1 = Math.min(n - 1, x0 + 1);
		const y1 = Math.min(n - 1, y0 + 1);
		const fx = x - x0;
		const fy = y - y0;
		return (
			src[y0 * n + x0] * (1 - fx) * (1 - fy) +
			src[y0 * n + x1] * fx * (1 - fy) +
			src[y1 * n + x0] * (1 - fx) * fy +
			src[y1 * n + x1] * fx * fy
		);
	}

	/** Resample `src` after translating by (dx, dy) px and rotating by deg about the centre. */
	function transform(src: Float32Array, dx: number, dy: number, deg: number) {
		const out = new Float32Array(nVox);
		const c = (n - 1) / 2;
		const a = (deg * Math.PI) / 180;
		const ca = Math.cos(a);
		const sa = Math.sin(a);
		for (let y = 0; y < n; y++) {
			for (let x = 0; x < n; x++) {
				const px = x - c - dx;
				const py = y - c - dy;
				const sx = px * ca + py * sa + c;
				const sy = -px * sa + py * ca + c;
				out[y * n + x] = sample(src, sx, sy);
			}
		}
		return out;
	}

	// the moving image is the fixed image with the hidden misalignment baked in
	const moving = transform(fixed, truth.tx, truth.ty, truth.rot);

	function cost(dx: number, dy: number, deg: number) {
		const m = transform(moving, dx, dy, deg);
		let s = 0;
		for (let k = 0; k < nVox; k++) {
			const d = m[k] - fixed[k];
			s += d * d;
		}
		return s / nVox;
	}

	let canvas: HTMLCanvasElement;
	const current = $state({ cost: 0 });

	$effect(() => {
		const m = transform(moving, tx, ty, rot);
		let s = 0;
		for (let k = 0; k < nVox; k++) {
			const d = m[k] - fixed[k];
			s += d * d;
		}
		current.cost = s / nVox;

		const ctx = setupCanvas(canvas, W, H);
		clear(ctx, W, H);
		// overlay: fixed in teal, moving in amber
		const ov = new ImageData(n, n);
		for (let k = 0; k < nVox; k++) {
			const f = Math.min(1, fixed[k] / fmax);
			const g = Math.min(1, m[k] / fmax);
			ov.data[k * 4] = 255 * g * 0.95 + 20 * f;
			ov.data[k * 4 + 1] = 190 * g * 0.5 + 200 * f;
			ov.data[k * 4 + 2] = 60 * g * 0.3 + 215 * f;
			ov.data[k * 4 + 3] = 255;
		}
		// checkerboard
		const cb = new ImageData(n, n);
		const tile = 16;
		for (let y = 0; y < n; y++) {
			for (let x = 0; x < n; x++) {
				const k = y * n + x;
				const useFixed = (Math.floor(x / tile) + Math.floor(y / tile)) % 2 === 0;
				const v = Math.min(255, ((useFixed ? fixed[k] : m[k]) / fmax) * 255);
				cb.data[k * 4] = v;
				cb.data[k * 4 + 1] = v;
				cb.data[k * 4 + 2] = v;
				cb.data[k * 4 + 3] = 255;
			}
		}
		const top = (H - P) / 2;
		blit(ctx, ov, gap, top, P, P);
		blit(ctx, cb, 2 * gap + P, top, P, P);
		label(ctx, 'fixed (teal) + moving (amber)', gap + 8, top + 8);
		label(ctx, 'checkerboard', 2 * gap + P + 8, top + 8);
	});

	/** Greedy coordinate descent with shrinking steps. Animated so the search is visible. */
	async function optimise() {
		if (running) return;
		running = true;
		iterations = 0;
		let step = 4;
		let best = cost(tx, ty, rot);
		while (step > 0.1 && running) {
			let improved = false;
			const moves: [number, number, number][] = [
				[step, 0, 0],
				[-step, 0, 0],
				[0, step, 0],
				[0, -step, 0],
				[0, 0, step * 1.5],
				[0, 0, -step * 1.5]
			];
			for (const [dx, dy, dr] of moves) {
				const c = cost(tx + dx, ty + dy, rot + dr);
				if (c < best - 1e-9) {
					best = c;
					tx += dx;
					ty += dy;
					rot += dr;
					improved = true;
					iterations++;
					await new Promise((r) => setTimeout(r, 45));
				}
			}
			if (!improved) step /= 2;
		}
		running = false;
	}

	function reset() {
		running = false;
		tx = 0;
		ty = 0;
		rot = 0;
		iterations = 0;
	}
</script>

<Demo
	title="Registration as an optimisation problem"
	caption="Two images of the same head, one moved. Registration searches for the transform that makes them agree, by scoring every candidate with a cost function and walking downhill. Here the cost is mean squared difference and the search is a naive coordinate descent. Real tools use smarter metrics (mutual information, cross-correlation), multi-resolution pyramids, and far more degrees of freedom."
>
	<canvas bind:this={canvas} style="aspect-ratio: {W} / {H}"></canvas>

	{#snippet controls()}
		<Slider label="Shift x" bind:value={tx} min={-20} max={20} step={0.5} unit=" px" format={(v) => v.toFixed(1)} />
		<Slider label="Shift y" bind:value={ty} min={-20} max={20} step={0.5} unit=" px" format={(v) => v.toFixed(1)} />
		<Slider label="Rotation" bind:value={rot} min={-30} max={30} step={0.5} unit="°" format={(v) => v.toFixed(1)} />
		<div class="row">
			<button type="button" class="go" onclick={optimise} disabled={running}>{running ? 'Searching…' : 'Optimise'}</button>
			<button type="button" class="reset" onclick={reset}>Reset</button>
		</div>
	{/snippet}

	{#snippet readout()}
		<div>Cost (MSE): <b>{current.cost.toExponential(2)}</b></div>
		<div>Accepted steps: <b>{iterations}</b></div>
		<div>True misalignment: <b>{-truth.tx}, {-truth.ty} px · {-truth.rot}°</b></div>
	{/snippet}
</Demo>

<style>
	.row {
		display: flex;
		gap: 0.5rem;
	}

	.go,
	.reset {
		font: 500 0.75rem var(--font-mono);
		padding: 0.5rem 0.8rem;
		border-radius: 6px;
		border: 1px solid var(--line-strong);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
	}

	.go {
		background: var(--ink);
		color: var(--paper);
		border-color: var(--ink);
	}

	.go[disabled] {
		opacity: 0.6;
		cursor: progress;
	}
</style>
