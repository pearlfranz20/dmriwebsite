import { eigSym3, fractionalAnisotropy } from './eig3';

/**
 * Linear least-squares diffusion tensor fit.
 *
 * Model: ln S_i = ln S0 - b_i * g_i^T D g_i
 * Unknowns: [Dxx, Dyy, Dzz, Dxy, Dxz, Dyz, ln S0]
 */
export type DtiFitter = {
	n: number;
	/** 7 x n pseudo-inverse of the design matrix, row-major. */
	pinv: Float64Array;
};

export function makeDtiFitter(bvals: ArrayLike<number>, bvecs: ArrayLike<number>): DtiFitter {
	const n = bvals.length;
	// Design matrix B (n x 7)
	const B = new Float64Array(n * 7);
	for (let i = 0; i < n; i++) {
		const b = bvals[i];
		const gx = bvecs[i * 3];
		const gy = bvecs[i * 3 + 1];
		const gz = bvecs[i * 3 + 2];
		B[i * 7 + 0] = -b * gx * gx;
		B[i * 7 + 1] = -b * gy * gy;
		B[i * 7 + 2] = -b * gz * gz;
		B[i * 7 + 3] = -2 * b * gx * gy;
		B[i * 7 + 4] = -2 * b * gx * gz;
		B[i * 7 + 5] = -2 * b * gy * gz;
		B[i * 7 + 6] = 1;
	}
	// Normal equations: (B^T B)^-1 B^T
	const BtB = new Float64Array(49);
	for (let r = 0; r < 7; r++) {
		for (let c = 0; c < 7; c++) {
			let s = 0;
			for (let i = 0; i < n; i++) s += B[i * 7 + r] * B[i * 7 + c];
			BtB[r * 7 + c] = s;
		}
	}
	const inv = invert(BtB, 7);
	const pinv = new Float64Array(7 * n);
	for (let r = 0; r < 7; r++) {
		for (let i = 0; i < n; i++) {
			let s = 0;
			for (let k = 0; k < 7; k++) s += inv[r * 7 + k] * B[i * 7 + k];
			pinv[r * n + i] = s;
		}
	}
	return { n, pinv };
}

/** Gauss–Jordan inverse of a small dense matrix (row-major). Returns identity-ish garbage on singular input. */
function invert(m: Float64Array, size: number): Float64Array {
	const a = Float64Array.from(m);
	const inv = new Float64Array(size * size);
	for (let i = 0; i < size; i++) inv[i * size + i] = 1;
	for (let col = 0; col < size; col++) {
		let pivot = col;
		for (let r = col + 1; r < size; r++) {
			if (Math.abs(a[r * size + col]) > Math.abs(a[pivot * size + col])) pivot = r;
		}
		if (pivot !== col) {
			for (let k = 0; k < size; k++) {
				[a[col * size + k], a[pivot * size + k]] = [a[pivot * size + k], a[col * size + k]];
				[inv[col * size + k], inv[pivot * size + k]] = [inv[pivot * size + k], inv[col * size + k]];
			}
		}
		const p = a[col * size + col] || 1e-12;
		for (let k = 0; k < size; k++) {
			a[col * size + k] /= p;
			inv[col * size + k] /= p;
		}
		for (let r = 0; r < size; r++) {
			if (r === col) continue;
			const f = a[r * size + col];
			if (f === 0) continue;
			for (let k = 0; k < size; k++) {
				a[r * size + k] -= f * a[col * size + k];
				inv[r * size + k] -= f * inv[col * size + k];
			}
		}
	}
	return inv;
}

export type TensorMetrics = {
	fa: number;
	md: number;
	ad: number;
	rd: number;
	evals: [number, number, number];
	/** principal eigenvector (unit) */
	e1: [number, number, number];
	s0: number;
};

const scratchLog = new Float64Array(512);

/** Fit one voxel. `signals` must be in the same order as the fitter's bvals. */
export function fitVoxel(fitter: DtiFitter, signals: ArrayLike<number>, offset = 0): TensorMetrics {
	const { n, pinv } = fitter;
	const logs = n <= scratchLog.length ? scratchLog : new Float64Array(n);
	for (let i = 0; i < n; i++) {
		const s = signals[offset + i];
		logs[i] = Math.log(s > 1e-6 ? s : 1e-6);
	}
	const x = new Float64Array(7);
	for (let r = 0; r < 7; r++) {
		let acc = 0;
		const base = r * n;
		for (let i = 0; i < n; i++) acc += pinv[base + i] * logs[i];
		x[r] = acc;
	}
	return tensorMetrics(x, Math.exp(x[6]));
}

export function tensorMetrics(d: ArrayLike<number>, s0 = 1): TensorMetrics {
	const { vals, vecs } = eigSym3(d);
	// Negative eigenvalues are a noise artifact; clamp for the summary metrics.
	const l1 = Math.max(vals[0], 0);
	const l2 = Math.max(vals[1], 0);
	const l3 = Math.max(vals[2], 0);
	return {
		fa: fractionalAnisotropy(l1, l2, l3),
		md: (l1 + l2 + l3) / 3,
		ad: l1,
		rd: (l2 + l3) / 2,
		evals: [l1, l2, l3],
		e1: [vecs[0], vecs[1], vecs[2]],
		s0
	};
}

/** Build the 3x3 tensor (6 unique elements) for a cylindrically symmetric fiber. */
export function fiberTensor(dir: [number, number, number], lPar: number, lPerp: number): Float64Array {
	const [x, y, z] = dir;
	const d = lPar - lPerp;
	return Float64Array.from([
		lPerp + d * x * x,
		lPerp + d * y * y,
		lPerp + d * z * z,
		d * x * y,
		d * x * z,
		d * y * z
	]);
}
