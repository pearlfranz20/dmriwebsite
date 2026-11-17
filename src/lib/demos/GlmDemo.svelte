<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { gaussian, mulberry32 } from '$lib/math/rng';

	let block = $state(20); // seconds on / off
	let amplitude = $state(1.0); // % signal change
	let noise = $state(0.8); // % std
	let drift = $state(1.5); // % over the run
	let modelDrift = $state(true);
	let seed = $state(1);

	const TR = 2;
	const T = 300; // seconds
	const N = T / TR;
	const W = 520;
	const H = 320;
	const padL = 40;
	const padR = 12;

	/** Canonical double-gamma HRF sampled at 1 s. */
	function hrf(t: number) {
		const g = (t: number, a: number, b: number) => (Math.pow(t, a - 1) * Math.exp(-t / b)) / (Math.pow(b, a) * gammaFn(a));
		return g(t, 6, 1) - g(t, 16, 1) / 6;
	}
	function gammaFn(z: number): number {
		// Lanczos approximation
		const p = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
		if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
		z -= 1;
		let x = 0.99999999999980993;
		for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
		const t = z + p.length - 0.5;
		return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
	}

	const sim = $derived.by(() => {
		// design at 1 s resolution, convolve, then sample every TR
		const design1 = new Float32Array(T);
		for (let t = 0; t < T; t++) design1[t] = Math.floor(t / block) % 2 === 1 ? 1 : 0;
		const kernel = Array.from({ length: 32 }, (_, i) => hrf(i));
		const pred1 = new Float32Array(T);
		for (let t = 0; t < T; t++) {
			let s = 0;
			for (let k = 0; k < kernel.length && t - k >= 0; k++) s += design1[t - k] * kernel[k];
			pred1[t] = s;
		}
		const pmax = Math.max(...pred1) || 1;
		const design = new Float32Array(N);
		const pred = new Float32Array(N);
		for (let i = 0; i < N; i++) {
			design[i] = design1[i * TR];
			pred[i] = pred1[i * TR] / pmax;
		}

		const g = gaussian(mulberry32(seed * 31));
		const data = new Float32Array(N);
		for (let i = 0; i < N; i++) {
			data[i] = amplitude * pred[i] + drift * (i / N) + noise * g();
		}

		// GLM: X = [pred, 1, (drift?)]
		const cols: Float32Array[] = [pred, new Float32Array(N).fill(1)];
		if (modelDrift) cols.push(Float32Array.from({ length: N }, (_, i) => i / N - 0.5));
		const p = cols.length;
		const XtX = new Float64Array(p * p);
		const Xty = new Float64Array(p);
		for (let r = 0; r < p; r++) {
			for (let c = 0; c < p; c++) {
				let s = 0;
				for (let i = 0; i < N; i++) s += cols[r][i] * cols[c][i];
				XtX[r * p + c] = s;
			}
			let s = 0;
			for (let i = 0; i < N; i++) s += cols[r][i] * data[i];
			Xty[r] = s;
		}
		const inv = invert(XtX, p);
		const beta = new Float64Array(p);
		for (let r = 0; r < p; r++) {
			let s = 0;
			for (let c = 0; c < p; c++) s += inv[r * p + c] * Xty[c];
			beta[r] = s;
		}
		const fitted = new Float32Array(N);
		let rss = 0;
		let tss = 0;
		const mean = data.reduce((a, b) => a + b, 0) / N;
		for (let i = 0; i < N; i++) {
			let f = 0;
			for (let c = 0; c < p; c++) f += beta[c] * cols[c][i];
			fitted[i] = f;
			rss += (data[i] - f) ** 2;
			tss += (data[i] - mean) ** 2;
		}
		const sigma2 = rss / (N - p);
		const se = Math.sqrt(sigma2 * inv[0]);
		return { design, pred, data, fitted, beta: beta[0], t: beta[0] / se, r2: 1 - rss / tss };
	});

	function invert(m: Float64Array, size: number) {
		const a = Float64Array.from(m);
		const inv = new Float64Array(size * size);
		for (let i = 0; i < size; i++) inv[i * size + i] = 1;
		for (let col = 0; col < size; col++) {
			let piv = col;
			for (let r = col + 1; r < size; r++) if (Math.abs(a[r * size + col]) > Math.abs(a[piv * size + col])) piv = r;
			for (let k = 0; k < size; k++) {
				[a[col * size + k], a[piv * size + k]] = [a[piv * size + k], a[col * size + k]];
				[inv[col * size + k], inv[piv * size + k]] = [inv[piv * size + k], inv[col * size + k]];
			}
			const d = a[col * size + col] || 1e-12;
			for (let k = 0; k < size; k++) {
				a[col * size + k] /= d;
				inv[col * size + k] /= d;
			}
			for (let r = 0; r < size; r++) {
				if (r === col) continue;
				const f = a[r * size + col];
				for (let k = 0; k < size; k++) {
					a[r * size + k] -= f * a[col * size + k];
					inv[r * size + k] -= f * inv[col * size + k];
				}
			}
		}
		return inv;
	}

	const x = (i: number) => padL + (i / (N - 1)) * (W - padL - padR);
	const lane = (idx: number, h: number) => ({ top: 14 + idx * (h + 14), h });
	const laneDesign = lane(0, 40);
	const laneData = { top: 80, h: 220 };
	const yD = (v: number) => laneData.top + laneData.h - ((v + 3) / 8) * laneData.h;
	const toPath = (arr: Float32Array, yf: (v: number) => number) =>
		Array.from(arr, (v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + yf(v).toFixed(1)).join('');
</script>

<Demo
	title="A voxel's time course and the model that explains it"
	caption="The task is a boxcar. The brain's blood-flow response smears it into the predicted BOLD curve, which lags by about five seconds. The measured signal is that curve plus scanner drift plus noise. A general linear model finds the amplitude that best fits, and the t-statistic says how confidently. Leave drift out of the model and watch the estimate degrade."
>
	<svg viewBox="0 0 {W} {H}" role="img" aria-label="fMRI time course, predicted response, and GLM fit">
		<rect width={W} height={H} fill="#0b1f2e" rx="12" />
		<!-- design -->
		{#each sim.design as d, i (i)}
			{#if d && (i === 0 || !sim.design[i - 1])}
				{@const j = sim.design.indexOf(0, i)}
				<rect x={x(i)} y={laneDesign.top} width={x(j < 0 ? N - 1 : j) - x(i)} height={laneDesign.h} fill="rgba(255,159,67,0.3)" />
			{/if}
		{/each}
		<text x={padL} y={laneDesign.top - 3} fill="rgba(255,255,255,0.45)" font-size="10" font-family="JetBrains Mono, monospace">task on / off</text>
		<path d={toPath(sim.pred, (v) => laneDesign.top + laneDesign.h - v * laneDesign.h)} fill="none" stroke="#ff9f43" stroke-width="1.5" />

		<!-- data -->
		<line x1={padL} x2={W - padR} y1={yD(0)} y2={yD(0)} stroke="rgba(255,255,255,0.12)" />
		<path d={toPath(sim.data, yD)} fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1" />
		<path d={toPath(sim.fitted, yD)} fill="none" stroke="#5ee0ff" stroke-width="2" />
		<text x={padL} y={laneData.top - 2} fill="rgba(255,255,255,0.45)" font-size="10" font-family="JetBrains Mono, monospace">measured signal (% change) and GLM fit</text>
		<text x={W - padR} y={H - 6} fill="rgba(255,255,255,0.4)" font-size="10" text-anchor="end" font-family="JetBrains Mono, monospace">{T} s · TR {TR} s · {N} volumes</text>
	</svg>

	{#snippet controls()}
		<Slider label="Block length" bind:value={block} min={6} max={40} step={2} unit=" s" />
		<Slider label="True amplitude" bind:value={amplitude} min={0} max={3} step={0.1} unit=" %" format={(v) => v.toFixed(1)} />
		<Slider label="Noise σ" bind:value={noise} min={0.1} max={3} step={0.1} unit=" %" format={(v) => v.toFixed(1)} />
		<Slider label="Scanner drift over run" bind:value={drift} min={0} max={4} step={0.1} unit=" %" format={(v) => v.toFixed(1)} />
		<label class="check">
			<input type="checkbox" bind:checked={modelDrift} />
			<span>Include drift regressor</span>
		</label>
		<button type="button" class="reseed" onclick={() => (seed += 1)}>New noise sample</button>
	{/snippet}

	{#snippet readout()}
		<div>Estimated amplitude: <b>{sim.beta.toFixed(2)} %</b> (true {amplitude.toFixed(1)})</div>
		<div>t-statistic: <b>{sim.t.toFixed(1)}</b></div>
		<div>R²: <b>{sim.r2.toFixed(2)}</b></div>
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

	.reseed {
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
