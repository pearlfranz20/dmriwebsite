/**
 * Minimal NIfTI-1 writer. Produces a single-file (.nii) byte array with a
 * 348-byte header, 4 bytes of extension padding, and little-endian voxel data.
 * Kept dependency-free so it can run on the server, in workers, or in the page.
 */

export const NIFTI_FLOAT32 = 16;
export const NIFTI_UINT8 = 2;
export const NIFTI_RGB24 = 128;

export type NiftiSpec = {
	/** [nx, ny, nz] or [nx, ny, nz, nt] */
	dims: number[];
	/** voxel sizes in mm, same length as dims */
	pixDims: number[];
	/** row-major 4x4 affine (16 numbers) mapping voxel → mm (sform) */
	affine: number[];
	datatype: typeof NIFTI_FLOAT32 | typeof NIFTI_UINT8 | typeof NIFTI_RGB24;
	data: Float32Array | Uint8Array;
	/** written into the header's descrip field */
	description?: string;
	/** NIfTI intent name, e.g. "FA" */
	intentName?: string;
};

export function buildNifti(spec: NiftiSpec): Uint8Array {
	const { dims, pixDims, affine, datatype, data } = spec;
	const bytesPerVoxel = datatype === NIFTI_FLOAT32 ? 4 : datatype === NIFTI_RGB24 ? 3 : 1;
	const nVox = dims.reduce((a, b) => a * b, 1);
	const expectedBytes = nVox * bytesPerVoxel;
	const dataBytes = data instanceof Float32Array ? data.length * 4 : data.length;
	if (dataBytes !== expectedBytes) {
		throw new Error(`NIfTI data size mismatch: expected ${expectedBytes} bytes, got ${dataBytes}.`);
	}
	if (affine.length !== 16) throw new Error('Affine must have 16 entries.');

	const headerSize = 352; // 348 + 4 extension bytes
	const buf = new ArrayBuffer(headerSize + expectedBytes);
	const view = new DataView(buf);
	const little = true;

	view.setInt32(0, 348, little); // sizeof_hdr
	// dim[8]
	view.setInt16(40, dims.length, little);
	for (let i = 0; i < 7; i++) view.setInt16(42 + i * 2, i < dims.length ? dims[i] : 1, little);
	view.setInt16(70, datatype, little); // datatype
	view.setInt16(72, bytesPerVoxel * 8, little); // bitpix
	// pixdim[8]: pixdim[0] = qfac
	view.setFloat32(76, 1, little);
	for (let i = 0; i < 7; i++) view.setFloat32(80 + i * 4, i < pixDims.length ? pixDims[i] : 1, little);
	view.setFloat32(108, headerSize, little); // vox_offset
	view.setFloat32(112, 1, little); // scl_slope
	view.setFloat32(116, 0, little); // scl_inter
	view.setInt8(123, 10); // xyzt_units: mm (2) | sec (8)
	const descrip = (spec.description ?? 'Scan to Result, in-browser').slice(0, 79);
	writeString(view, 148, descrip, 80);
	view.setInt16(252, 0, little); // qform_code: unknown
	view.setInt16(254, 1, little); // sform_code: scanner anat
	for (let i = 0; i < 12; i++) view.setFloat32(280 + i * 4, affine[i], little); // srow_x, srow_y, srow_z
	writeString(view, 328, spec.intentName ?? '', 16);
	writeString(view, 344, 'n+1\0', 4);
	// extension flag bytes 348..351 stay zero

	const out = new Uint8Array(buf);
	if (data instanceof Float32Array) {
		const dv = new DataView(buf, headerSize);
		for (let i = 0; i < data.length; i++) dv.setFloat32(i * 4, data[i], little);
	} else {
		out.set(data, headerSize);
	}
	return out;
}

function writeString(view: DataView, offset: number, text: string, maxLen: number) {
	for (let i = 0; i < maxLen; i++) {
		view.setUint8(offset + i, i < text.length ? text.charCodeAt(i) & 0xff : 0);
	}
}

/** Flatten a nested 4x4 affine (as NiiVue's hdr.affine) into 16 row-major numbers. */
export function flattenAffine(affine: number[][] | undefined, pixDims: number[]): number[] {
	if (affine && affine.length === 4 && affine.every((r) => r.length === 4)) {
		return affine.flat();
	}
	return [pixDims[0] ?? 1, 0, 0, 0, 0, pixDims[1] ?? 1, 0, 0, 0, 0, pixDims[2] ?? 1, 0, 0, 0, 0, 1];
}

/** Trigger a browser download of raw bytes. */
export function downloadBytes(bytes: Uint8Array, filename: string) {
	const blob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
