import { gaussian, mulberry32 } from '$lib/math/rng';

/**
 * A 2D "brain slice" phantom shared by the demos. It carries a tissue label per
 * pixel, relaxation parameters for the structural demos, and a one- or
 * two-fiber microstructure model for the diffusion demos.
 */

export const TISSUE = { BG: 0, CSF: 1, GM: 2, WM: 3 } as const;
export type TissueId = (typeof TISSUE)[keyof typeof TISSUE];

/** Rough 3 T relaxation values. T1/T2 in ms, PD relative. */
export const relaxation: Record<TissueId, { t1: number; t2: number; pd: number; name: string }> = {
	0: { t1: 1, t2: 1, pd: 0, name: 'Air' },
	1: { t1: 4000, t2: 2000, pd: 1.0, name: 'CSF' },
	2: { t1: 1330, t2: 110, pd: 0.86, name: 'Gray matter' },
	3: { t1: 830, t2: 80, pd: 0.72, name: 'White matter' }
};

/** Diffusivities in mm²/s. */
export const diffusivity = {
	csf: 3.0e-3,
	gm: 0.8e-3,
	fiberPar: 1.7e-3,
	fiberPerp: 0.3e-3,
	/** generic white matter without a named bundle: modestly anisotropic */
	wmPar: 1.2e-3,
	wmPerp: 0.5e-3
};

export type Phantom = {
	n: number;
	tissue: Uint8Array;
	/** b=0 signal (T2-weighted-ish), 0..1 */
	s0: Float32Array;
	/** number of fiber compartments (0 for isotropic tissue) */
	nFib: Uint8Array;
	/** in-plane fiber angles (radians) */
	theta1: Float32Array;
	theta2: Float32Array;
	/** volume fraction of fiber 1 (fiber 2 gets the rest) */
	f1: Float32Array;
	/** per-fiber diffusivities */
	lPar: Float32Array;
	lPerp: Float32Array;
	/** isotropic diffusivity for CSF/GM */
	dIso: Float32Array;
	/** 1 inside the head */
	mask: Uint8Array;
};

function insideEllipse(x: number, y: number, cx: number, cy: number, a: number, b: number, rot = 0) {
	const c = Math.cos(rot);
	const s = Math.sin(rot);
	const dx = x - cx;
	const dy = y - cy;
	const u = dx * c + dy * s;
	const v = -dx * s + dy * c;
	return (u * u) / (a * a) + (v * v) / (b * b) <= 1;
}

const cache = new Map<number, Phantom>();

export function makePhantom(n = 128): Phantom {
	const hit = cache.get(n);
	if (hit) return hit;

	const tissue = new Uint8Array(n * n);
	const s0 = new Float32Array(n * n);
	const nFib = new Uint8Array(n * n);
	const theta1 = new Float32Array(n * n);
	const theta2 = new Float32Array(n * n);
	const f1 = new Float32Array(n * n);
	const lPar = new Float32Array(n * n);
	const lPerp = new Float32Array(n * n);
	const dIso = new Float32Array(n * n);
	const mask = new Uint8Array(n * n);

	// Bundle geometry in normalised coordinates (x right, y up, both in [-1, 1]).
	const arc = { cx: 0, cy: -0.5, r: 0.58, w: 0.1 };
	const cst = { x: 0.4, w: 0.075, y0: -0.78, y1: 0.55 };

	for (let j = 0; j < n; j++) {
		for (let i = 0; i < n; i++) {
			const x = ((i + 0.5) / n) * 2 - 1;
			const y = 1 - ((j + 0.5) / n) * 2;
			const k = j * n + i;

			if (!insideEllipse(x, y, 0, 0, 0.9, 0.96)) continue;
			mask[k] = 1;

			let t: TissueId = TISSUE.WM;
			if (!insideEllipse(x, y, 0, 0, 0.84, 0.9)) t = TISSUE.CSF;
			else if (!insideEllipse(x, y, 0, 0, 0.73, 0.79)) t = TISSUE.GM;
			// a couple of sulci for realism
			else if (
				insideEllipse(x, y, 0, 0.72, 0.045, 0.2) ||
				insideEllipse(x, y, -0.55, 0.42, 0.04, 0.16, 0.5) ||
				insideEllipse(x, y, 0.55, 0.42, 0.04, 0.16, -0.5)
			) {
				t = TISSUE.CSF;
			}
			// ventricles
			if (
				insideEllipse(x, y, -0.17, -0.04, 0.11, 0.27, 0.15) ||
				insideEllipse(x, y, 0.17, -0.04, 0.11, 0.27, -0.15)
			) {
				t = TISSUE.CSF;
			}

			tissue[k] = t;

			if (t === TISSUE.CSF) {
				s0[k] = 1.0;
				dIso[k] = diffusivity.csf;
				continue;
			}
			if (t === TISSUE.GM) {
				s0[k] = 0.82;
				dIso[k] = diffusivity.gm;
				continue;
			}

			// White matter: default gently anisotropic field following concentric ellipses
			s0[k] = 0.68;
			const defaultTheta = Math.atan2(y / 0.79, x / 0.73) + Math.PI / 2;
			let fibers = 0;
			let th1 = defaultTheta;
			let th2 = 0;
			let par = diffusivity.wmPar;
			let perp = diffusivity.wmPerp;

			// callosal-style arc
			const dxA = x - arc.cx;
			const dyA = y - arc.cy;
			const rA = Math.hypot(dxA, dyA);
			const inArc = Math.abs(rA - arc.r) < arc.w / 2 && y > arc.cy + 0.05;
			// vertical projection bundles
			const inCst = Math.abs(Math.abs(x) - cst.x) < cst.w && y > cst.y0 && y < cst.y1;

			if (inArc) {
				fibers = 1;
				th1 = Math.atan2(dyA, dxA) + Math.PI / 2;
				par = diffusivity.fiberPar;
				perp = diffusivity.fiberPerp;
			}
			if (inCst) {
				if (fibers === 1) {
					fibers = 2;
					th2 = Math.PI / 2;
				} else {
					fibers = 1;
					th1 = Math.PI / 2;
					par = diffusivity.fiberPar;
					perp = diffusivity.fiberPerp;
				}
			}
			if (fibers === 0) fibers = 1;

			nFib[k] = fibers;
			theta1[k] = th1;
			theta2[k] = th2;
			f1[k] = fibers === 2 ? 0.5 : 1;
			lPar[k] = par;
			lPerp[k] = perp;
		}
	}

	const p: Phantom = { n, tissue, s0, nFib, theta1, theta2, f1, lPar, lPerp, dIso, mask };
	cache.set(n, p);
	return p;
}

/** Normalised diffusion signal E(b, g) = S/S0 for one pixel. g is a unit 3-vector. */
export function attenuation(p: Phantom, k: number, b: number, gx: number, gy: number, gz: number) {
	void gz;
	if (p.nFib[k] === 0) return Math.exp(-b * p.dIso[k]);
	const par = p.lPar[k];
	const perp = p.lPerp[k];
	const d = par - perp;
	const c1 = Math.cos(p.theta1[k]) * gx + Math.sin(p.theta1[k]) * gy;
	let e = p.f1[k] * Math.exp(-b * (perp + d * c1 * c1));
	if (p.nFib[k] === 2) {
		const c2 = Math.cos(p.theta2[k]) * gx + Math.sin(p.theta2[k]) * gy;
		e += (1 - p.f1[k]) * Math.exp(-b * (perp + d * c2 * c2));
	}
	return e;
}

/**
 * Synthesize a full set of diffusion-weighted images for the phantom.
 * Returns a Float32Array of shape [nDir][n*n].
 * Noise is Rician with sigma = 1/snr relative to a unit b0 signal.
 */
export function synthesizeDwi(
	p: Phantom,
	bvals: ArrayLike<number>,
	bvecs: ArrayLike<number>,
	snr: number,
	seed = 7
): Float32Array {
	const nVox = p.n * p.n;
	const nDir = bvals.length;
	const out = new Float32Array(nDir * nVox);
	const sigma = snr > 0 ? 1 / snr : 0;
	const g = gaussian(mulberry32(seed));
	for (let d = 0; d < nDir; d++) {
		const b = bvals[d];
		const gx = bvecs[d * 3];
		const gy = bvecs[d * 3 + 1];
		const gz = bvecs[d * 3 + 2];
		const base = d * nVox;
		for (let k = 0; k < nVox; k++) {
			if (!p.mask[k]) {
				if (sigma > 0) out[base + k] = Math.hypot(sigma * g(), sigma * g());
				continue;
			}
			const s = p.s0[k] * attenuation(p, k, b, gx, gy, gz);
			out[base + k] = sigma > 0 ? Math.hypot(s + sigma * g(), sigma * g()) : s;
		}
	}
	return out;
}

/** Spin-echo / inversion-recovery signal for a tissue given sequence parameters (ms). */
export function relaxSignal(
	t: TissueId,
	tr: number,
	te: number,
	ti: number | null
): number {
	const { t1, t2, pd } = relaxation[t];
	if (pd === 0) return 0;
	const e2 = Math.exp(-te / t2);
	if (ti === null) return pd * (1 - Math.exp(-tr / t1)) * e2;
	// inversion recovery (magnitude image)
	return pd * Math.abs(1 - 2 * Math.exp(-ti / t1) + Math.exp(-tr / t1)) * e2;
}
