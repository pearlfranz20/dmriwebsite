<script lang="ts">
	import Demo from '$lib/components/Demo.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import { fractionalAnisotropy } from '$lib/math/eig3';

	// eigenvalues in µm²/ms
	let l1 = $state(1.7);
	let l2 = $state(0.3);
	let l3 = $state(0.3);
	let yaw = $state(0.6);
	let pitch = $state(-0.45);

	const presets = [
		{ name: 'White matter', v: [1.7, 0.3, 0.3] },
		{ name: 'Gray matter', v: [0.9, 0.8, 0.7] },
		{ name: 'CSF', v: [3.0, 3.0, 3.0] },
		{ name: 'Crossing (oblate)', v: [1.3, 1.2, 0.3] }
	];

	const fa = $derived(fractionalAnisotropy(l1, l2, l3));
	const md = $derived((l1 + l2 + l3) / 3);

	const S = 300;
	const cx = S / 2;
	const cy = S / 2;
	const R = 110;

	type P3 = [number, number, number];

	function rotate([x, y, z]: P3): P3 {
		// yaw about y, then pitch about x
		const cyw = Math.cos(yaw);
		const syw = Math.sin(yaw);
		const x1 = x * cyw + z * syw;
		const z1 = -x * syw + z * cyw;
		const cp = Math.cos(pitch);
		const sp = Math.sin(pitch);
		const y2 = y * cp - z1 * sp;
		const z2 = y * sp + z1 * cp;
		return [x1, y2, z2];
	}

	// radius along each axis scales with sqrt(eigenvalue): the RMS displacement
	const scale = $derived.by(() => {
		const m = Math.sqrt(Math.max(l1, l2, l3));
		return [Math.sqrt(l1) / m, Math.sqrt(l2) / m, Math.sqrt(l3) / m];
	});

	function project(p: P3) {
		const [x, y, z] = rotate([p[0] * scale[0], p[1] * scale[1], p[2] * scale[2]]);
		return { x: cx + x * R, y: cy - y * R, z };
	}

	const lines = $derived.by(() => {
		const out: { d: string; z: number }[] = [];
		const nLat = 7;
		const nLon = 12;
		const segs = 36;
		// parallels (around the principal axis, which is x)
		for (let i = 1; i < nLat; i++) {
			const t = (i / nLat) * Math.PI;
			let d = '';
			let zs = 0;
			for (let s = 0; s <= segs; s++) {
				const a = (s / segs) * Math.PI * 2;
				const p = project([Math.cos(t), Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a)]);
				d += (s ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
				zs += p.z;
			}
			out.push({ d, z: zs / (segs + 1) });
		}
		// meridians
		for (let j = 0; j < nLon; j++) {
			const a = (j / nLon) * Math.PI;
			let d = '';
			let zs = 0;
			for (let s = 0; s <= segs; s++) {
				const t = (s / segs) * Math.PI * 2;
				const p = project([Math.cos(t), Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a)]);
				d += (s ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
				zs += p.z;
			}
			out.push({ d, z: zs / (segs + 1) });
		}
		return out;
	});

	const axes = $derived([
		{ p: project([1.25, 0, 0]), n: project([-1.25, 0, 0]), color: '#ff6b6b', name: 'λ₁' },
		{ p: project([0, 1.25, 0]), n: project([0, -1.25, 0]), color: '#6be39a', name: 'λ₂' },
		{ p: project([0, 0, 1.25]), n: project([0, 0, -1.25]), color: '#6ba8ff', name: 'λ₃' }
	]);

	let dragging = false;
	let lastX = 0;
	let lastY = 0;
	function down(e: PointerEvent) {
		dragging = true;
		lastX = e.clientX;
		lastY = e.clientY;
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}
	function move(e: PointerEvent) {
		if (!dragging) return;
		yaw += (e.clientX - lastX) * 0.01;
		pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - lastY) * 0.01));
		lastX = e.clientX;
		lastY = e.clientY;
	}
	function up() {
		dragging = false;
	}
</script>

<Demo
	title="The diffusion tensor as a shape"
	caption="A tensor is an ellipsoid whose radii are the root-mean-square distances water travels along each axis. Long and thin means coherent fibers. A sphere means nothing is organized, or everything is organized in every direction, which is the problem the next demo is about."
>
	<svg
		viewBox="0 0 {S} {S}"
		class="ell"
		role="img"
		aria-label="Rotatable diffusion ellipsoid"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
	>
		<rect width={S} height={S} fill="#0b1f2e" rx="12" />
		{#each axes as a (a.name)}
			<line x1={a.n.x} y1={a.n.y} x2={a.p.x} y2={a.p.y} stroke={a.color} stroke-width="1" opacity="0.5" stroke-dasharray="3 3" />
		{/each}
		{#each lines as l, i (i)}
			<path d={l.d} fill="none" stroke="#5ee0ff" stroke-width="1" opacity={0.25 + 0.6 * (l.z + 1) * 0.5} />
		{/each}
		{#each axes as a (a.name)}
			<circle cx={a.p.x} cy={a.p.y} r="3.5" fill={a.color} />
			<text x={a.p.x + 6} y={a.p.y - 6} fill={a.color} font-size="11" font-family="JetBrains Mono, monospace">{a.name}</text>
		{/each}
		<text x="12" y={S - 12} fill="rgba(255,255,255,0.4)" font-size="10" font-family="JetBrains Mono, monospace">drag to rotate</text>
	</svg>

	{#snippet controls()}
		<Slider label="λ₁ (largest)" bind:value={l1} min={0.1} max={3} step={0.05} unit=" µm²/ms" format={(v) => v.toFixed(2)} />
		<Slider label="λ₂" bind:value={l2} min={0.1} max={3} step={0.05} unit=" µm²/ms" format={(v) => v.toFixed(2)} />
		<Slider label="λ₃ (smallest)" bind:value={l3} min={0.1} max={3} step={0.05} unit=" µm²/ms" format={(v) => v.toFixed(2)} />
		<div class="presets">
			{#each presets as p (p.name)}
				<button type="button" onclick={() => ([l1, l2, l3] = p.v as [number, number, number])}>{p.name}</button>
			{/each}
		</div>
	{/snippet}

	{#snippet readout()}
		<div>FA: <b>{fa.toFixed(3)}</b></div>
		<div>MD: <b>{md.toFixed(2)} µm²/ms</b></div>
		<div>Axial (λ₁): <b>{l1.toFixed(2)}</b> · Radial ((λ₂+λ₃)/2): <b>{((l2 + l3) / 2).toFixed(2)}</b></div>
	{/snippet}
</Demo>

<style>
	.ell {
		cursor: grab;
		touch-action: none;
		user-select: none;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.presets button {
		font: 500 0.72rem var(--font-mono);
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--line-strong);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
	}

	.presets button:hover {
		border-color: var(--ink);
		color: var(--ink);
	}
</style>
