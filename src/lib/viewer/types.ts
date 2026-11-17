/** Shared message types between the viewer page and its workers. */

export type Dims3 = [number, number, number];

export type DtiRequest = {
	type: 'dti';
	/** frame-major voxel data: all voxels of frame 0, then frame 1, ... x fastest */
	img: Float32Array;
	dims: Dims3;
	nFrames: number;
	bvals: Float32Array;
	/** flat xyz per frame, length nFrames*3 */
	bvecs: Float32Array;
};

export type DtiResult = {
	type: 'dti-done';
	fa: Float32Array;
	md: Float32Array;
	rgb: Uint8Array;
	mask: Uint8Array;
	maskCount: number;
	meanFa: number;
	meanMd: number;
	ms: number;
};

export type SegRequest = {
	type: 'seg';
	img: Float32Array;
	dims: Dims3;
	pixDims: Dims3;
};

export type SegResult = {
	type: 'seg-done';
	labels: Uint8Array;
	counts: [number, number, number];
	volumesMl: [number, number, number];
	means: [number, number, number];
	histogram: { bins: Float32Array; lo: number; hi: number };
	threshold: number;
	ms: number;
};

export type Progress = { type: 'progress'; value: number; label: string };
export type WorkerError = { type: 'error'; message: string };

export type WorkerMessage = DtiResult | SegResult | Progress | WorkerError;
