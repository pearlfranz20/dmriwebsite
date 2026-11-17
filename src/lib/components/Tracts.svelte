<script lang="ts">
	/**
	 * Decorative tractography-style streamlines. Generated deterministically so the
	 * server-rendered markup matches the client and nothing flickers on hydration.
	 */
	type Bundle = {
		start: [number, number];
		c1: [number, number];
		c2: [number, number];
		end: [number, number];
		count: number;
		spread: number;
		color: string;
		delay: number;
	};

	function rng(seed: number) {
		let t = seed >>> 0;
		return () => {
			t += 0x6d2b79f5;
			let r = Math.imul(t ^ (t >>> 15), 1 | t);
			r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		};
	}

	const bundles: Bundle[] = [
		// long association arch (arcuate-like)
		{
			start: [92, 372],
			c1: [120, 60],
			c2: [470, 40],
			end: [532, 318],
			count: 22,
			spread: 26,
			color: 'url(#g-teal)',
			delay: 0
		},
		// shallow commissural curve
		{
			start: [60, 250],
			c1: [220, 150],
			c2: [380, 150],
			end: [560, 250],
			count: 16,
			spread: 18,
			color: 'url(#g-amber)',
			delay: 0.8
		},
		// descending projection
		{
			start: [262, 58],
			c1: [372, 190],
			c2: [228, 360],
			end: [352, 504],
			count: 14,
			spread: 16,
			color: 'url(#g-sky)',
			delay: 1.6
		}
	];

	const rand = rng(20240917);

	const paths = bundles.flatMap((b, bi) =>
		Array.from({ length: b.count }, (_, i) => {
			const j = () => (rand() - 0.5) * 2 * b.spread;
			const k = () => (rand() - 0.5) * 2 * b.spread * 1.6;
			const d = `M ${b.start[0] + j()} ${b.start[1] + j()} C ${b.c1[0] + k()} ${b.c1[1] + k()}, ${b.c2[0] + k()} ${b.c2[1] + k()}, ${b.end[0] + j()} ${b.end[1] + j()}`;
			return {
				id: `${bi}-${i}`,
				d,
				color: b.color,
				width: 0.9 + rand() * 1.3,
				opacity: 0.35 + rand() * 0.55,
				delay: b.delay + rand() * 1.2,
				dur: 6 + rand() * 5
			};
		})
	);
</script>

<svg
	class="tracts"
	viewBox="0 0 620 540"
	role="img"
	aria-label="Illustration of bundled white-matter streamlines"
>
	<defs>
		<linearGradient id="g-teal" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#2cc1c8" />
			<stop offset="1" stop-color="#5ee0ff" />
		</linearGradient>
		<linearGradient id="g-amber" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#ff9f43" />
			<stop offset="1" stop-color="#ffd27a" />
		</linearGradient>
		<linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#8fb2ff" />
			<stop offset="1" stop-color="#c8b6ff" />
		</linearGradient>
		<radialGradient id="g-glow" cx="0.5" cy="0.45" r="0.6">
			<stop offset="0" stop-color="#16405c" />
			<stop offset="1" stop-color="#0b1f2e" />
		</radialGradient>
		<pattern id="grid" width="31" height="31" patternUnits="userSpaceOnUse">
			<path d="M 31 0 L 0 0 0 31" fill="none" stroke="rgba(255,255,255,0.045)" stroke-width="1" />
		</pattern>
	</defs>

	<rect width="620" height="540" fill="url(#g-glow)" />
	<rect width="620" height="540" fill="url(#grid)" />

	<g fill="none" stroke-linecap="round">
		{#each paths as p (p.id)}
			<path
				d={p.d}
				stroke={p.color}
				stroke-width={p.width}
				stroke-opacity={p.opacity}
				style="--delay:{p.delay}s; --dur:{p.dur}s"
			/>
		{/each}
	</g>

	<g class="hud" font-family="JetBrains Mono, ui-monospace, monospace" font-size="10" fill="rgba(255,255,255,0.55)">
		<text x="22" y="30">FA-weighted · 3 bundles</text>
		<text x="598" y="520" text-anchor="end">n = {paths.length} streamlines</text>
	</g>
</svg>

<style>
	.tracts {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--radius-lg);
	}

	path {
		stroke-dasharray: 18 14;
		animation: flow var(--dur) linear infinite;
		animation-delay: calc(var(--delay) * -1);
	}

	@keyframes flow {
		to {
			stroke-dashoffset: -320;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		path {
			animation: none;
			stroke-dasharray: none;
		}
	}
</style>
