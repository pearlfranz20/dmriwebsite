import { fibonacciSphere, gaussian, mulberry32 } from '$lib/math/rng';
import { buildNifti, NIFTI_FLOAT32 } from './nifti';

/**
 * A small synthetic diffusion dataset: an ellipsoidal "head" of isotropic
 * tissue, two CSF-like blobs, and two fiber bundles that cross in the middle.
 * Enough to exercise a tensor fit without downloading anything.
 */
export type SyntheticDwi = {
	bytes: Uint8Array;
	bvals: Float32Array;
	bvecs: Float32Array;
	dims: [number, number, number];
	nFrames: number;
	name: string;
};

export function makeSyntheticDwi(opts: { nx?: number; ny?: number; nz?: number; nDir?: number; snr?: number } = {}): SyntheticDwi {
	const nx = opts.nx ?? 64;
	const ny = opts.ny ?? 64;
	const nz = opts.nz ?? 24;
	const nDir = opts.nDir ?? 24;
	const snr = opts.snr ?? 25;
	const nFrames = nDir + 1;
	const nVox = nx * ny * nz;
	const vox = 2; // mm

	const dirs = fibonacciSphere(nDir, true);
	const bvals = new Float32Array(nFrames);
	const bvecs = new Float32Array(nFrames * 3);
	for (let d = 0; d < nDir; d++) {
		bvals[d + 1] = 1000;
		bvecs[(d + 1) * 3] = dirs[d * 3];
		bvecs[(d + 1) * 3 + 1] = dirs[d * 3 + 1];
		bvecs[(d + 1) * 3 + 2] = dirs[d * 3 + 2];
	}

	const lPar = 1.7e-3;
	const lPerp = 0.3e-3;
	const dIso = 0.8e-3;
	const dCsf = 3.0e-3;

	const img = new Float32Array(nFrames * nVox);
	const g = gaussian(mulberry32(42));
	const sigma = 1 / snr;

	for (let z = 0; z < nz; z++) {
		const w = (z + 0.5) / nz - 0.5; // -0.5..0.5
		for (let y = 0; y < ny; y++) {
			const v = (y + 0.5) / ny - 0.5;
			for (let x = 0; x < nx; x++) {
				const u = (x + 0.5) / nx - 0.5;
				const k = z * nx * ny + y * nx + x;

				const inside = (u / 0.44) ** 2 + (v / 0.46) ** 2 + (w / 0.42) ** 2 <= 1;
				if (!inside) {
					for (let f = 0; f < nFrames; f++) {
						img[f * nVox + k] = Math.hypot(sigma * g(), sigma * g());
					}
					continue;
				}

				const csf =
					((u + 0.18) / 0.07) ** 2 + ((v - 0.02) / 0.16) ** 2 + (w / 0.2) ** 2 <= 1 ||
					((u - 0.18) / 0.07) ** 2 + ((v - 0.02) / 0.16) ** 2 + (w / 0.2) ** 2 <= 1;
				const bundleX = Math.abs(v + 0.22) < 0.07 && Math.abs(w) < 0.12; // runs along x
				const bundleY = Math.abs(u) < 0.07 && Math.abs(w + 0.05) < 0.12; // runs along y
				const s0 = csf ? 1.0 : bundleX || bundleY ? 0.68 : 0.82;

				for (let f = 0; f < nFrames; f++) {
					const b = bvals[f];
					let e: number;
					if (b === 0) e = 1;
					else if (csf) e = Math.exp(-b * dCsf);
					else if (bundleX && bundleY) {
						const gx = bvecs[f * 3];
						const gy = bvecs[f * 3 + 1];
						e =
							0.5 * Math.exp(-b * (lPerp + (lPar - lPerp) * gx * gx)) +
							0.5 * Math.exp(-b * (lPerp + (lPar - lPerp) * gy * gy));
					} else if (bundleX) {
						const gx = bvecs[f * 3];
						e = Math.exp(-b * (lPerp + (lPar - lPerp) * gx * gx));
					} else if (bundleY) {
						const gy = bvecs[f * 3 + 1];
						e = Math.exp(-b * (lPerp + (lPar - lPerp) * gy * gy));
					} else e = Math.exp(-b * dIso);
					const s = s0 * e;
					img[f * nVox + k] = Math.hypot(s + sigma * g(), sigma * g());
				}
			}
		}
	}

	const affine = [vox, 0, 0, -(nx * vox) / 2, 0, vox, 0, -(ny * vox) / 2, 0, 0, vox, -(nz * vox) / 2, 0, 0, 0, 1];
	const bytes = buildNifti({
		dims: [nx, ny, nz, nFrames],
		pixDims: [vox, vox, vox, 1],
		affine,
		datatype: NIFTI_FLOAT32,
		data: img,
		description: 'Synthetic DWI, two crossing bundles',
		intentName: 'DWI'
	});

	return { bytes, bvals, bvecs, dims: [nx, ny, nz], nFrames, name: 'synthetic_dwi.nii' };
}
