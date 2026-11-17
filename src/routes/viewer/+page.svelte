<script lang="ts">
	import { onMount } from 'svelte';
	import type { Niivue, NVImage, SLICE_TYPE as SliceTypeEnum } from '@niivue/niivue';
	import { site } from '$lib/site';
	import { parseBval, parseBvec } from '$lib/viewer/bvec';
	import { buildNifti, downloadBytes, flattenAffine, NIFTI_FLOAT32, NIFTI_RGB24, NIFTI_UINT8 } from '$lib/viewer/nifti';
	import { makeSyntheticDwi } from '$lib/viewer/synth';
	import type { Dims3, DtiRequest, DtiResult, SegRequest, SegResult, WorkerMessage } from '$lib/viewer/types';

	type NvModule = typeof import('@niivue/niivue');

	type LoadedItem =
		| { kind: 'volume'; id: string; name: string; dims: Dims3; nFrames: number; vox: Dims3 }
		| { kind: 'bval'; id: string; name: string; count: number }
		| { kind: 'bvec'; id: string; name: string; count: number };

	type Overlay = { id: string; name: string; colormap: string; label: string };

	let canvas = $state<HTMLCanvasElement | null>(null);
	let nv: Niivue | null = null;
	let mods: NvModule | null = null;
	let base: NVImage | null = null;

	let ready = $state(false);
	let fatal = $state('');
	let error = $state('');
	let notice = $state('');
	let busy = $state('');
	let progress = $state(0);
	let dragging = $state(false);

	let items = $state<LoadedItem[]>([]);
	let overlays = $state<Overlay[]>([]);
	let activeOverlayId = $state('');
	let overlayOpacity = $state(1);
	let overlayCmap = $state('gray');
	let layout = $state<'multiplanar' | 'axial' | 'render'>('multiplanar');
	let frame = $state(0);

	let bvals: Float32Array | null = null;
	let bvecs: Float32Array | null = null;
	let bvalCount = $state(0);
	let bvecCount = $state(0);

	let dti = $state<DtiResult | null>(null);
	let seg = $state<SegResult | null>(null);
	let faBytes: Uint8Array | null = null;

	const cmapChoices = ['gray', 'hot', 'viridis', 'plasma', 'inferno', 'jet', 'random'];

	const baseItem = $derived(items.find((i): i is Extract<LoadedItem, { kind: 'volume' }> => i.kind === 'volume') ?? null);
	const is4D = $derived(!!baseItem && baseItem.nFrames > 1);
	const canFitDti = $derived(
		!!baseItem && is4D && bvalCount === baseItem.nFrames && bvecCount === baseItem.nFrames
	);
	const dtiBlocker = $derived.by(() => {
		if (!baseItem) return 'Load a 4D diffusion volume plus its .bval and .bvec files.';
		if (!is4D) return 'The loaded volume is 3D. A tensor fit needs a 4D series of diffusion-weighted images.';
		if (!bvalCount || !bvecCount) return 'Add the matching .bval and .bvec files.';
		if (bvalCount !== baseItem.nFrames || bvecCount !== baseItem.nFrames) {
			return `The volume has ${baseItem.nFrames} frames but the gradient files describe ${bvalCount} b-values and ${bvecCount} directions.`;
		}
		return '';
	});
	const canSegment = $derived(!!baseItem && !busy);

	onMount(() => {
		let disposed = false;
		(async () => {
			const probe = document.createElement('canvas');
			if (!probe.getContext('webgl2')) {
				fatal = 'This browser does not support WebGL2, which the viewer needs to draw volumes. Try a current Chrome, Firefox, or Safari.';
				return;
			}
			try {
				mods = await import('@niivue/niivue');
				if (disposed || !canvas) return;
				nv = new mods.Niivue({
					backColor: [0.043, 0.075, 0.106, 1],
					dragAndDropEnabled: false,
					isColorbar: false,
					show3Dcrosshair: true,
					multiplanarShowRender: mods.SHOW_RENDER.ALWAYS,
					crosshairColor: [0.17, 0.76, 0.78, 1],
					isOrientCube: false
				});
				await nv.attachToCanvas(canvas);
				nv.setSliceType(mods.SLICE_TYPE.MULTIPLANAR);
				ready = true;
			} catch (err) {
				fatal = `The viewer failed to start: ${err instanceof Error ? err.message : String(err)}`;
			}
		})();
		return () => {
			disposed = true;
		};
	});

	function sliceTypeFor(kind: typeof layout): SliceTypeEnum {
		const S = mods!.SLICE_TYPE;
		return kind === 'axial' ? S.AXIAL : kind === 'render' ? S.RENDER : S.MULTIPLANAR;
	}

	$effect(() => {
		if (!nv || !mods || !ready) return;
		nv.setSliceType(sliceTypeFor(layout));
	});

	function uid() {
		return Math.random().toString(36).slice(2, 10);
	}

	function volumeInfo(vol: NVImage): { dims: Dims3; vox: Dims3; nFrames: number } {
		const hdr = vol.hdr;
		if (!hdr) throw new Error('The file has no readable NIfTI header.');
		const dims: Dims3 = [hdr.dims[1], hdr.dims[2], hdr.dims[3]];
		const vox: Dims3 = [hdr.pixDims[1] || 1, hdr.pixDims[2] || 1, hdr.pixDims[3] || 1];
		const nFrames = vol.nFrame4D ?? (hdr.dims[0] > 3 ? hdr.dims[4] : 1);
		return { dims, vox, nFrames };
	}

	function clearScene() {
		if (!nv) return;
		while (nv.volumes.length) nv.removeVolume(nv.volumes[0]);
		base = null;
		overlays = [];
		activeOverlayId = '';
		dti = null;
		seg = null;
		faBytes = null;
		frame = 0;
		items = items.filter((i) => i.kind !== 'volume');
	}

	function adoptBase(vol: NVImage, name: string) {
		const info = volumeInfo(vol);
		base = vol;
		items = [{ kind: 'volume', id: uid(), name, ...info }, ...items.filter((i) => i.kind !== 'volume')];
		if (nv && is4DVolume(vol)) nv.setFrame4D(vol.id, 0);
	}

	function is4DVolume(vol: NVImage) {
		return (vol.nFrame4D ?? 1) > 1;
	}

	async function loadVolumeFile(file: File) {
		if (!nv || !mods) return;
		const vol = await mods.NVImage.loadFromFile({ file, name: file.name });
		clearScene();
		nv.addVolume(vol);
		adoptBase(vol, file.name);
	}

	async function loadVolumeBytes(bytes: Uint8Array, name: string): Promise<NVImage> {
		if (!nv) throw new Error('Viewer not ready.');
		const before = nv.volumes.length;
		const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
		await nv.loadFromArrayBuffer(ab, name);
		const vol = nv.volumes[nv.volumes.length - 1];
		if (!vol || nv.volumes.length === before) throw new Error(`NiiVue did not accept ${name}.`);
		return vol;
	}

	async function handleFiles(list: FileList | File[]) {
		if (!ready || !nv) return;
		error = '';
		notice = '';
		const files = Array.from(list);
		for (const file of files) {
			const lower = file.name.toLowerCase();
			try {
				if (lower.endsWith('.bval') || lower.endsWith('.bvals')) {
					bvals = parseBval(await file.text());
					bvalCount = bvals.length;
					items = [...items.filter((i) => i.kind !== 'bval'), { kind: 'bval', id: uid(), name: file.name, count: bvals.length }];
				} else if (lower.endsWith('.bvec') || lower.endsWith('.bvecs')) {
					bvecs = parseBvec(await file.text());
					bvecCount = bvecs.length / 3;
					items = [...items.filter((i) => i.kind !== 'bvec'), { kind: 'bvec', id: uid(), name: file.name, count: bvecCount }];
				} else if (lower.endsWith('.nii') || lower.endsWith('.nii.gz')) {
					busy = `Reading ${file.name}`;
					progress = 0;
					await loadVolumeFile(file);
					busy = '';
				} else {
					throw new Error(`"${file.name}" is not a .nii, .nii.gz, .bval, or .bvec file.`);
				}
			} catch (err) {
				busy = '';
				error = err instanceof Error ? err.message : String(err);
			}
		}
	}

	async function loadSynthetic() {
		if (!ready || !nv) return;
		error = '';
		busy = 'Generating a synthetic diffusion dataset';
		progress = 0;
		await new Promise((r) => setTimeout(r, 20));
		try {
			const s = makeSyntheticDwi();
			clearScene();
			const vol = await loadVolumeBytes(s.bytes, s.name);
			adoptBase(vol, s.name);
			bvals = s.bvals;
			bvecs = s.bvecs;
			bvalCount = s.bvals.length;
			bvecCount = s.bvecs.length / 3;
			items = [
				...items.filter((i) => i.kind === 'volume'),
				{ kind: 'bval', id: uid(), name: 'synthetic.bval', count: bvalCount },
				{ kind: 'bvec', id: uid(), name: 'synthetic.bvec', count: bvecCount }
			];
			notice = 'Synthetic data loaded: two crossing fiber bundles inside an isotropic head, with Rician noise at SNR 25. Scroll the frame slider to see how signal drops along each gradient direction.';
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			busy = '';
		}
	}

	function removeItem(item: LoadedItem) {
		if (item.kind === 'volume') {
			clearScene();
			return;
		}
		if (item.kind === 'bval') {
			bvals = null;
			bvalCount = 0;
		}
		if (item.kind === 'bvec') {
			bvecs = null;
			bvecCount = 0;
		}
		items = items.filter((i) => i.id !== item.id);
	}

	function removeOverlays() {
		if (!nv) return;
		for (const o of overlays) {
			const idx = nv.getVolumeIndexByID(o.id);
			if (idx >= 0) nv.removeVolume(nv.volumes[idx]);
		}
		overlays = [];
		activeOverlayId = '';
	}

	function setFrame(f: number) {
		frame = f;
		if (nv && base) nv.setFrame4D(base.id, f);
	}

	function applyOverlayOpacity(v: number) {
		overlayOpacity = v;
		if (!nv || !activeOverlayId) return;
		const idx = nv.getVolumeIndexByID(activeOverlayId);
		if (idx >= 0) nv.setOpacity(idx, v);
	}

	function applyOverlayCmap(cm: string) {
		overlayCmap = cm;
		if (!nv || !activeOverlayId) return;
		nv.setColormap(activeOverlayId, cm);
		overlays = overlays.map((o) => (o.id === activeOverlayId ? { ...o, colormap: cm } : o));
	}

	function selectOverlay(id: string) {
		activeOverlayId = id;
		if (!nv) return;
		const idx = nv.getVolumeIndexByID(id);
		if (idx < 0) return;
		const vol = nv.volumes[idx];
		overlayCmap = overlays.find((o) => o.id === id)?.colormap ?? 'gray';
		overlayOpacity = vol.opacity;
		// bring the selected overlay to the top of the stack
		if (idx !== nv.volumes.length - 1) nv.setVolume(vol, nv.volumes.length - 1);
	}

	function baseGeometry() {
		if (!base || !base.hdr) throw new Error('No base volume.');
		const info = volumeInfo(base);
		const affine = flattenAffine(base.hdr.affine, info.vox);
		return { ...info, affine };
	}

	async function addResultOverlay(
		data: Float32Array | Uint8Array,
		datatype: typeof NIFTI_FLOAT32 | typeof NIFTI_UINT8 | typeof NIFTI_RGB24,
		name: string,
		label: string,
		colormap: string,
		opacity: number,
		calRange?: [number, number]
	) {
		if (!nv) return null;
		const g = baseGeometry();
		const bytes = buildNifti({ dims: g.dims, pixDims: g.vox, affine: g.affine, datatype, data, intentName: label });
		const vol = await loadVolumeBytes(bytes, name);
		const idx = nv.getVolumeIndexByID(vol.id);
		if (datatype !== NIFTI_RGB24) nv.setColormap(vol.id, colormap);
		if (calRange) {
			vol.cal_min = calRange[0];
			vol.cal_max = calRange[1];
		}
		nv.setOpacity(idx, opacity);
		nv.updateGLVolume();
		overlays = [...overlays, { id: vol.id, name, colormap, label }];
		return { vol, bytes };
	}

	function runWorker<TReq, TRes extends WorkerMessage>(worker: Worker, req: TReq, transfer: Transferable[], doneType: TRes['type']) {
		return new Promise<TRes>((resolve, reject) => {
			worker.onmessage = (ev: MessageEvent<WorkerMessage>) => {
				const m = ev.data;
				if (m.type === 'progress') {
					progress = m.value;
					busy = m.label;
				} else if (m.type === 'error') {
					reject(new Error(m.message));
				} else if (m.type === doneType) {
					resolve(m as TRes);
				}
			};
			worker.onerror = (e) => reject(new Error(e.message || 'Worker crashed.'));
			worker.postMessage(req, transfer);
		});
	}

	async function fitDti() {
		if (!nv || !base || !bvals || !bvecs || !canFitDti) return;
		error = '';
		busy = 'Copying voxels to a worker';
		progress = 0;
		const g = baseGeometry();
		if (!base.img) {
			error = 'The volume has no voxel data loaded.';
			busy = '';
			return;
		}
		const img = Float32Array.from(base.img);
		const req: DtiRequest = {
			type: 'dti',
			img,
			dims: g.dims,
			nFrames: g.nFrames,
			bvals: Float32Array.from(bvals),
			bvecs: Float32Array.from(bvecs)
		};
		const worker = new Worker(new URL('../../lib/viewer/dti.worker.ts', import.meta.url), { type: 'module' });
		try {
			const res = await runWorker<DtiRequest, DtiResult>(worker, req, [img.buffer, req.bvals.buffer, req.bvecs.buffer], 'dti-done');
			busy = 'Adding maps to the viewer';
			removeOverlays();
			const mdScaled = new Float32Array(res.md.length);
			for (let i = 0; i < res.md.length; i++) mdScaled[i] = res.md[i] * 1000; // µm²/ms
			const faVol = await addResultOverlay(res.fa, NIFTI_FLOAT32, 'FA.nii', 'FA', 'gray', 1, [0, 1]);
			await addResultOverlay(mdScaled, NIFTI_FLOAT32, 'MD.nii', 'MD', 'viridis', 0, [0, 3.5]);
			await addResultOverlay(res.rgb, NIFTI_RGB24, 'colorFA.nii', 'Color FA', 'gray', 0);
			faBytes = faVol?.bytes ?? null;
			dti = res;
			if (faVol) selectOverlay(faVol.vol.id);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			worker.terminate();
			busy = '';
		}
	}

	async function segment() {
		if (!nv || !base || !canSegment) return;
		error = '';
		busy = 'Copying voxels to a worker';
		progress = 0;
		const g = baseGeometry();
		if (!base.img) {
			error = 'The volume has no voxel data loaded.';
			busy = '';
			return;
		}
		const nVox = g.dims[0] * g.dims[1] * g.dims[2];
		const start = Math.min(frame, g.nFrames - 1) * nVox;
		const img = Float32Array.from(base.img.subarray(start, start + nVox));
		const req: SegRequest = { type: 'seg', img, dims: g.dims, pixDims: g.vox };
		const worker = new Worker(new URL('../../lib/viewer/seg.worker.ts', import.meta.url), { type: 'module' });
		try {
			const res = await runWorker<SegRequest, SegResult>(worker, req, [img.buffer], 'seg-done');
			busy = 'Adding labels to the viewer';
			removeOverlays();
			const lab = await addResultOverlay(res.labels, NIFTI_UINT8, 'labels.nii', 'Tissue labels', 'random', 0.5, [0, 3]);
			seg = res;
			if (lab) selectOverlay(lab.vol.id);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			worker.terminate();
			busy = '';
		}
	}

	function downloadFa() {
		if (faBytes) downloadBytes(faBytes, 'FA.nii');
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
	}

	function onInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files?.length) handleFiles(input.files);
		input.value = '';
	}

	const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
	/** Intensity values span orders of magnitude between datasets; pick decimals by size. */
	const fmtAuto = (v: number) =>
		!Number.isFinite(v) ? '–' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3);
	const histMax = $derived(seg ? Math.max(1, ...Array.from(seg.histogram.bins)) : 1);
	const histX = (v: number) => (seg ? ((v - seg.histogram.lo) / (seg.histogram.hi - seg.histogram.lo)) * 100 : 0);

	const title = `Process your data · ${site.name}`;
	const description =
		'Load your own NIfTI brain MRI in the browser, fit a diffusion tensor, segment tissue, and inspect the results. Nothing is uploaded.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="{site.url}/viewer" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>

<section class="intro wrap">
	<p class="eyebrow">Process your data</p>
	<h1>Run the pipeline on your own scans.</h1>
	<p class="lead">
		Drop a NIfTI file here and the browser does the work. Files never leave your computer: there is
		no upload, no server, no account. Fit a diffusion tensor from a 4D series with its b-values and
		directions, or segment tissue on any 3D volume, then inspect the maps slice by slice.
	</p>
</section>

<section class="viewer wrap">
	<div class="left">
		<div
			class="drop"
			class:dragging
			class:disabled={!ready}
			role="group"
			aria-label="Load files"
			ondragover={(e) => {
				e.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={onDrop}
		>
			<div class="drop-inner">
				<p class="drop-title">Drop files here</p>
				<p class="drop-sub">.nii, .nii.gz, .bval, .bvec. Several at once is fine.</p>
				<div class="drop-actions">
					<label class="btn btn-primary btn-sm">
						Choose files
						<input type="file" multiple accept=".nii,.gz,.bval,.bvec,.bvals,.bvecs" onchange={onInput} disabled={!ready} />
					</label>
					<button class="btn btn-ghost btn-sm" type="button" onclick={loadSynthetic} disabled={!ready || !!busy}>
						Load a synthetic DWI dataset
					</button>
				</div>
			</div>
		</div>

		{#if items.length}
			<ul class="chips" aria-label="Loaded files">
				{#each items as item (item.id)}
					<li class="chip chip-{item.kind}">
						<span class="chip-kind">{item.kind}</span>
						<span class="chip-name">{item.name}</span>
						<span class="chip-meta">
							{#if item.kind === 'volume'}
								{item.dims.join('×')}{item.nFrames > 1 ? ` × ${item.nFrames}` : ''} · {item.vox.map((v) => fmt(v, 1)).join('×')} mm
							{:else}
								{item.count} entries
							{/if}
						</span>
						<button type="button" class="chip-x" aria-label="Remove {item.name}" onclick={() => removeItem(item)}>×</button>
					</li>
				{/each}
			</ul>
		{/if}

		{#if fatal}
			<p class="msg bad" role="alert">{fatal}</p>
		{:else if error}
			<p class="msg bad" role="alert">{error}</p>
		{/if}
		{#if notice}
			<p class="msg ok" role="status">{notice}</p>
		{/if}

		<div class="stage">
			<div class="toolbar">
				<div class="seg" role="group" aria-label="Layout">
					{#each [['multiplanar', 'Multiplanar'], ['axial', 'Axial'], ['render', '3D']] as [key, label] (key)}
						<button type="button" class:on={layout === key} onclick={() => (layout = key as typeof layout)} disabled={!ready}>{label}</button>
					{/each}
				</div>
				{#if is4D && baseItem}
					<label class="frame">
						<span>Frame <output>{frame + 1}/{baseItem.nFrames}</output></span>
						<input type="range" min="0" max={baseItem.nFrames - 1} step="1" value={frame} oninput={(e) => setFrame(Number((e.currentTarget as HTMLInputElement).value))} />
					</label>
				{/if}
			</div>
			<div class="canvas-wrap">
				<canvas bind:this={canvas}></canvas>
				{#if !baseItem && ready}
					<p class="empty">No volume loaded yet.</p>
				{/if}
				{#if busy}
					<div class="progress" role="status" aria-live="polite">
						<span>{busy}</span>
						<div class="bar"><div class="fill" style="width: {Math.round(progress * 100)}%"></div></div>
					</div>
				{/if}
			</div>
			{#if overlays.length}
				<div class="overlays">
					<div class="ov-row">
						<span class="ov-label">Overlay</span>
						<div class="seg" role="group" aria-label="Overlay">
							{#each overlays as o (o.id)}
								<button type="button" class:on={activeOverlayId === o.id} onclick={() => selectOverlay(o.id)}>{o.label}</button>
							{/each}
						</div>
						<button type="button" class="link" onclick={removeOverlays}>Remove overlays</button>
					</div>
					<div class="ov-row">
						<label class="inline">
							<span>Opacity <output>{fmt(overlayOpacity, 2)}</output></span>
							<input type="range" min="0" max="1" step="0.05" value={overlayOpacity} oninput={(e) => applyOverlayOpacity(Number((e.currentTarget as HTMLInputElement).value))} />
						</label>
						{#if overlays.find((o) => o.id === activeOverlayId)?.label !== 'Color FA'}
							<label class="inline">
								<span>Colormap</span>
								<select value={overlayCmap} onchange={(e) => applyOverlayCmap((e.currentTarget as HTMLSelectElement).value)}>
									{#each cmapChoices as c (c)}
										<option value={c}>{c}</option>
									{/each}
								</select>
							</label>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<aside class="right">
		<div class="panel">
			<p class="panel-eyebrow">Diffusion</p>
			<h2>Fit a diffusion tensor</h2>
			<p class="panel-text">
				Mean b=0, an Otsu brain mask, then a linear least-squares tensor fit in every masked voxel.
				Produces FA, mean diffusivity, and a direction-encoded color map.
			</p>
			<button class="btn btn-primary" type="button" onclick={fitDti} disabled={!canFitDti || !!busy}>Fit diffusion tensor</button>
			{#if dtiBlocker}
				<p class="hint">{dtiBlocker}</p>
			{/if}
			{#if dti}
				<dl class="stats">
					<div><dt>Mask voxels</dt><dd>{dti.maskCount.toLocaleString()}</dd></div>
					<div><dt>Mean FA</dt><dd>{fmt(dti.meanFa, 3)}</dd></div>
					<div><dt>Mean MD</dt><dd>{fmt(dti.meanMd * 1000, 2)} µm²/ms</dd></div>
					{#if baseItem}
						<div><dt>Voxel size</dt><dd>{baseItem.vox.map((v) => fmt(v, 2)).join(' × ')} mm</dd></div>
					{/if}
					<div><dt>Fit time</dt><dd>{(dti.ms / 1000).toFixed(1)} s</dd></div>
				</dl>
				<button class="btn btn-ghost btn-sm" type="button" onclick={downloadFa}>Download FA (.nii)</button>
			{/if}
		</div>

		<div class="panel">
			<p class="panel-eyebrow">Any volume</p>
			<h2>Segment tissue</h2>
			<p class="panel-text">
				Otsu foreground, then 3-class k-means on intensity. On a T1-weighted image the classes
				roughly correspond to CSF, gray matter, and white matter; real pipelines add bias-field
				correction and spatial priors on top of this.
			</p>
			<button class="btn btn-primary" type="button" onclick={segment} disabled={!canSegment || !!busy}>
				Segment tissue{is4D ? ` (frame ${frame + 1})` : ''}
			</button>
			{#if !baseItem}
				<p class="hint">Load any 3D NIfTI volume first.</p>
			{/if}
			{#if seg}
				<svg class="hist" viewBox="0 0 100 40" preserveAspectRatio="none" aria-label="Intensity histogram with class means">
					{#each seg.histogram.bins as b, i (i)}
						<rect x={(i / seg.histogram.bins.length) * 100} y={40 - (b / histMax) * 38} width={100 / seg.histogram.bins.length} height={(b / histMax) * 38} />
					{/each}
					{#each seg.means as m, i (i)}
						<line x1={histX(m)} x2={histX(m)} y1="0" y2="40" class="mean mean-{i}" />
					{/each}
				</svg>
				<dl class="stats">
					{#each ['Class 1 (dark)', 'Class 2', 'Class 3 (bright)'] as name, i (name)}
						<div class="cls cls-{i}"><dt>{name}</dt><dd>{seg.volumesMl[i].toFixed(0)} mL · mean {fmtAuto(seg.means[i])}</dd></div>
					{/each}
					<div><dt>Foreground threshold</dt><dd>{fmtAuto(seg.threshold)}</dd></div>
				</dl>
			{/if}
		</div>
	</aside>
</section>

<section class="scope wrap">
	<h2>What this does and doesn't do</h2>
	<div class="scope-grid">
		<div>
			<h3>It does</h3>
			<ul>
				<li>Read NIfTI-1 and NIfTI-2 volumes, compressed or not, entirely in your browser</li>
				<li>Fit a plain linear least-squares diffusion tensor and derive FA, MD, and color FA</li>
				<li>Segment a volume into three intensity classes and report their volumes</li>
				<li>Let you download the FA map as a NIfTI file</li>
			</ul>
		</div>
		<div>
			<h3>It doesn't</h3>
			<ul>
				<li>Correct for motion, eddy currents, or susceptibility distortion</li>
				<li>Denoise, remove Gibbs ringing, or correct bias fields</li>
				<li>Fit crossing-fiber models or run tractography</li>
				<li>Produce anything you should put in a paper. This is for exploration and teaching.</li>
			</ul>
		</div>
	</div>
	<p class="scope-note">
		Want to see what those missing steps change? The <a href="/diffusion">diffusion walkthrough</a> demonstrates each one on synthetic data.
	</p>
</section>

<style>
	.intro {
		padding: clamp(3rem, 6vw, 5rem) 0 clamp(1.5rem, 3vw, 2.5rem);
		max-width: 760px;
		margin-left: auto;
		margin-right: auto;
	}

	.intro h1 {
		font-size: clamp(2.4rem, 5vw, 3.6rem);
		font-weight: 400;
		font-variation-settings: 'opsz' 144;
		letter-spacing: -0.025em;
	}

	.lead {
		margin-top: 1.25rem;
		font-size: 1.1rem;
		color: var(--ink-2);
	}

	.viewer {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
		gap: 2rem;
		align-items: start;
		padding-bottom: 3rem;
	}

	.left {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}

	/* ---- drop zone ---- */
	.drop {
		border: 1.5px dashed var(--line-strong);
		border-radius: var(--radius-lg);
		background: #fff;
		padding: 1.5rem;
		transition:
			border-color 140ms ease,
			background-color 140ms ease;
	}

	.drop.dragging {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.drop.disabled {
		opacity: 0.6;
	}

	.drop-inner {
		display: grid;
		gap: 0.35rem;
		text-align: center;
		justify-items: center;
	}

	.drop-title {
		font-family: var(--font-display);
		font-size: 1.35rem;
	}

	.drop-sub {
		font-size: 0.85rem;
		color: var(--muted);
	}

	.drop-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin-top: 0.75rem;
		justify-content: center;
	}

	.drop-actions input[type='file'] {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		overflow: hidden;
	}

	.drop-actions label.btn {
		position: relative;
	}

	/* ---- chips ---- */
	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.4rem 0.35rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: #fff;
		font-size: 0.8rem;
		max-width: 100%;
	}

	.chip-kind {
		font: 500 0.62rem var(--font-mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-ink);
		background: var(--accent-soft);
		padding: 0.2rem 0.4rem;
		border-radius: 999px;
	}

	.chip-bval .chip-kind,
	.chip-bvec .chip-kind {
		color: #8a4b0f;
		background: rgba(224, 134, 43, 0.15);
	}

	.chip-name {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 16rem;
	}

	.chip-meta {
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	.chip-x {
		border: 0;
		background: transparent;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		cursor: pointer;
		color: var(--muted);
		font-size: 1rem;
		line-height: 1;
	}

	.chip-x:hover {
		background: var(--paper-2);
		color: var(--ink);
	}

	/* ---- messages ---- */
	.msg {
		font-size: 0.9rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		border: 1px solid var(--line);
		background: #fff;
	}

	.msg.bad {
		border-color: rgba(176, 54, 44, 0.35);
		background: rgba(176, 54, 44, 0.07);
		color: #8d2a22;
	}

	.msg.ok {
		border-color: rgba(14, 111, 143, 0.3);
		background: var(--accent-soft);
		color: var(--accent-ink);
	}

	/* ---- stage ---- */
	.stage {
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: #fff;
		box-shadow: var(--shadow);
	}

	.toolbar,
	.overlays {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		align-items: center;
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid var(--line);
		background: var(--paper);
		font-size: 0.85rem;
	}

	.overlays {
		border-bottom: 0;
		border-top: 1px solid var(--line);
		flex-direction: column;
		align-items: stretch;
		gap: 0.6rem;
	}

	.ov-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		align-items: center;
	}

	.ov-label {
		font: 500 0.68rem var(--font-mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.seg {
		display: inline-flex;
		border: 1px solid var(--line-strong);
		border-radius: 999px;
		overflow: hidden;
	}

	.seg button {
		border: 0;
		background: transparent;
		padding: 0.4rem 0.8rem;
		font: 500 0.8rem var(--font-body);
		color: var(--ink-2);
		cursor: pointer;
	}

	.seg button + button {
		border-left: 1px solid var(--line);
	}

	.seg button.on {
		background: var(--ink);
		color: var(--paper);
	}

	.seg button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.frame,
	.inline {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex: 1;
		min-width: 200px;
	}

	.frame span,
	.inline span {
		white-space: nowrap;
		color: var(--ink-2);
	}

	.frame output,
	.inline output {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		margin-left: 0.3rem;
		color: var(--ink);
	}

	.frame input,
	.inline input[type='range'] {
		flex: 1;
		accent-color: var(--accent);
		margin: 0;
	}

	.inline select {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: #fff;
	}

	.link {
		border: 0;
		background: transparent;
		color: var(--accent-ink);
		cursor: pointer;
		font: inherit;
		font-size: 0.8rem;
		text-decoration: underline;
		margin-left: auto;
	}

	.canvas-wrap {
		position: relative;
		height: 520px;
		background: #0b1f2e;
	}

	.canvas-wrap canvas {
		width: 100%;
		height: 100%;
		display: block;
	}

	.empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: rgba(255, 255, 255, 0.5);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		pointer-events: none;
	}

	.progress {
		position: absolute;
		left: 1rem;
		right: 1rem;
		bottom: 1rem;
		background: rgba(11, 31, 46, 0.85);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--radius);
		padding: 0.6rem 0.8rem;
		color: #e9eef2;
		font-size: 0.8rem;
		display: grid;
		gap: 0.4rem;
		backdrop-filter: blur(6px);
	}

	.bar {
		height: 4px;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 999px;
		overflow: hidden;
	}

	.fill {
		height: 100%;
		background: #5ee0ff;
		transition: width 120ms linear;
	}

	/* ---- right panels ---- */
	.right {
		display: grid;
		gap: 1rem;
		position: sticky;
		top: 5.5rem;
	}

	.panel {
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		background: #fff;
		padding: 1.25rem;
		display: grid;
		gap: 0.75rem;
		box-shadow: var(--shadow);
	}

	.panel-eyebrow {
		font: 500 0.68rem var(--font-mono);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.panel h2 {
		font-size: 1.4rem;
	}

	.panel-text {
		font-size: 0.9rem;
		color: var(--ink-2);
	}

	.panel .btn[disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.hint {
		font-size: 0.8rem;
		color: var(--muted);
	}

	.stats {
		margin: 0.25rem 0 0;
		display: grid;
		gap: 0.4rem;
		font-size: 0.85rem;
	}

	.stats div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		border-top: 1px solid var(--line);
		padding-top: 0.4rem;
	}

	.stats dt {
		color: var(--muted);
	}

	.stats dd {
		margin: 0;
		font-family: var(--font-mono);
		font-size: 0.78rem;
		text-align: right;
	}

	.stats .cls dt::before {
		content: '';
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 2px;
		margin-right: 0.4rem;
		vertical-align: middle;
		background: var(--c, #999);
	}

	.cls-0 {
		--c: #4083d4;
	}
	.cls-1 {
		--c: #d68f36;
	}
	.cls-2 {
		--c: #8ad0b6;
	}

	.hist {
		width: 100%;
		height: 70px;
		display: block;
		background: var(--paper);
		border-radius: 8px;
		border: 1px solid var(--line);
	}

	.hist rect {
		fill: rgba(14, 111, 143, 0.55);
	}

	.hist .mean {
		stroke-width: 0.8;
		vector-effect: non-scaling-stroke;
	}

	.hist .mean-0 {
		stroke: #4083d4;
	}
	.hist .mean-1 {
		stroke: #d68f36;
	}
	.hist .mean-2 {
		stroke: #4f9c86;
	}

	/* ---- scope ---- */
	.scope {
		padding: 1rem 0 2rem;
		max-width: 900px;
		margin-left: auto;
		margin-right: auto;
	}

	.scope h2 {
		font-size: clamp(1.6rem, 3vw, 2.1rem);
		margin-bottom: 1.25rem;
	}

	.scope-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		padding: 1.5rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		background: var(--paper-2);
	}

	.scope h3 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.scope ul {
		margin: 0;
		padding-left: 1.1rem;
		color: var(--ink-2);
		font-size: 0.92rem;
		display: grid;
		gap: 0.35rem;
	}

	.scope-note {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: var(--ink-2);
	}

	.scope-note a {
		color: var(--accent-ink);
	}

	@media (max-width: 960px) {
		.viewer {
			grid-template-columns: 1fr;
		}

		.right {
			position: static;
		}
	}

	@media (max-width: 600px) {
		.scope-grid {
			grid-template-columns: 1fr;
		}

		.canvas-wrap {
			height: 400px;
		}
	}
</style>
