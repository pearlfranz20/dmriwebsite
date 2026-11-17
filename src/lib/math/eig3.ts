/**
 * Eigen-decomposition of a symmetric 3x3 matrix by cyclic Jacobi rotations.
 * Input is the six unique elements [xx, yy, zz, xy, xz, yz].
 * Returns eigenvalues sorted descending and the matching unit eigenvectors
 * (row-major: vecs[0..2] is the first eigenvector).
 */
export function eigSym3(d: ArrayLike<number>): { vals: [number, number, number]; vecs: Float64Array } {
	const a = [
		[d[0], d[3], d[4]],
		[d[3], d[1], d[5]],
		[d[4], d[5], d[2]]
	];
	const v = [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	];

	for (let sweep = 0; sweep < 20; sweep++) {
		const off = a[0][1] ** 2 + a[0][2] ** 2 + a[1][2] ** 2;
		if (off < 1e-24) break;
		for (let p = 0; p < 2; p++) {
			for (let q = p + 1; q < 3; q++) {
				if (Math.abs(a[p][q]) < 1e-30) continue;
				const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
				const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
				const c = 1 / Math.sqrt(t * t + 1);
				const s = t * c;
				for (let k = 0; k < 3; k++) {
					const akp = a[k][p];
					const akq = a[k][q];
					a[k][p] = c * akp - s * akq;
					a[k][q] = s * akp + c * akq;
				}
				for (let k = 0; k < 3; k++) {
					const apk = a[p][k];
					const aqk = a[q][k];
					a[p][k] = c * apk - s * aqk;
					a[q][k] = s * apk + c * aqk;
				}
				for (let k = 0; k < 3; k++) {
					const vkp = v[k][p];
					const vkq = v[k][q];
					v[k][p] = c * vkp - s * vkq;
					v[k][q] = s * vkp + c * vkq;
				}
			}
		}
	}

	const order = [0, 1, 2].sort((i, j) => a[j][j] - a[i][i]);
	const vals: [number, number, number] = [a[order[0]][order[0]], a[order[1]][order[1]], a[order[2]][order[2]]];
	const vecs = new Float64Array(9);
	for (let r = 0; r < 3; r++) {
		const col = order[r];
		vecs[r * 3] = v[0][col];
		vecs[r * 3 + 1] = v[1][col];
		vecs[r * 3 + 2] = v[2][col];
	}
	return { vals, vecs };
}

/** Fractional anisotropy from three eigenvalues. */
export function fractionalAnisotropy(l1: number, l2: number, l3: number) {
	const m = (l1 + l2 + l3) / 3;
	const num = (l1 - m) ** 2 + (l2 - m) ** 2 + (l3 - m) ** 2;
	const den = l1 * l1 + l2 * l2 + l3 * l3;
	if (den <= 0) return 0;
	return Math.min(1, Math.sqrt(1.5 * (num / den)));
}
