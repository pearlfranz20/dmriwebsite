/** Parsers for FSL-style bval / bvec text files. */

function tokens(text: string): number[][] {
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('#'))
		.map((line) => line.split(/[\s,]+/).filter(Boolean).map(Number));
}

export function parseBval(text: string): Float32Array {
	const rows = tokens(text);
	const flat = rows.flat();
	if (!flat.length || flat.some((v) => !Number.isFinite(v))) {
		throw new Error('Could not read b-values from this file.');
	}
	return Float32Array.from(flat);
}

/**
 * Accepts either the FSL layout (3 rows, N columns) or the transposed layout
 * (N rows, 3 columns). Returns a flat xyz array of length N*3, with each
 * non-zero vector normalised to unit length.
 */
export function parseBvec(text: string): Float32Array {
	const rows = tokens(text).filter((r) => r.length > 0);
	if (!rows.length) throw new Error('The bvec file is empty.');

	let n: number;
	let get: (i: number, c: number) => number;
	if (rows.length === 3 && rows[0].length !== 3) {
		n = rows[0].length;
		if (rows[1].length !== n || rows[2].length !== n) {
			throw new Error('The bvec rows have different lengths.');
		}
		get = (i, c) => rows[c][i];
	} else if (rows.every((r) => r.length === 3)) {
		n = rows.length;
		get = (i, c) => rows[i][c];
	} else {
		throw new Error('Expected a bvec file with 3 rows or 3 columns.');
	}

	const out = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		const x = get(i, 0);
		const y = get(i, 1);
		const z = get(i, 2);
		if (![x, y, z].every(Number.isFinite)) throw new Error('The bvec file contains non-numeric values.');
		const len = Math.hypot(x, y, z);
		out[i * 3] = len > 0 ? x / len : 0;
		out[i * 3 + 1] = len > 0 ? y / len : 0;
		out[i * 3 + 2] = len > 0 ? z / len : 0;
	}
	return out;
}
