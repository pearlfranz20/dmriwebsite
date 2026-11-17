/** Small deterministic PRNG so demos render identically on server and client. */
export function mulberry32(seed: number) {
	let t = seed >>> 0;
	return function next() {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

/** Standard-normal sampler (Box–Muller) on top of a uniform generator. */
export function gaussian(next: () => number) {
	let spare: number | null = null;
	return function sample() {
		if (spare !== null) {
			const v = spare;
			spare = null;
			return v;
		}
		let u = 0;
		let v = 0;
		while (u === 0) u = next();
		v = next();
		const mag = Math.sqrt(-2 * Math.log(u));
		spare = mag * Math.sin(2 * Math.PI * v);
		return mag * Math.cos(2 * Math.PI * v);
	};
}

/** Approximately uniform directions on the unit sphere (Fibonacci lattice), optionally hemisphere-only. */
export function fibonacciSphere(n: number, hemisphere = true): Float32Array {
	const out = new Float32Array(n * 3);
	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < n; i++) {
		// For a hemisphere we sample z in (0, 1]; for the full sphere z in (-1, 1).
		const z = hemisphere ? 1 - (i + 0.5) / n : 1 - (2 * (i + 0.5)) / n;
		const r = Math.sqrt(Math.max(0, 1 - z * z));
		const phi = i * golden;
		out[i * 3] = r * Math.cos(phi);
		out[i * 3 + 1] = r * Math.sin(phi);
		out[i * 3 + 2] = z;
	}
	return out;
}
