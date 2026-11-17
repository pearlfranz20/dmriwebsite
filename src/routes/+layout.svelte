<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { site } from '$lib/site';

	let { children } = $props();

	const nav = [
		{ href: '/diffusion', label: 'Diffusion' },
		{ href: '/structural', label: 'Structural' },
		{ href: '/functional', label: 'Functional' },
		{ href: '/about', label: 'About' }
	];

	let menuOpen = $state(false);
	const isActive = (href: string) => page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:site_name" content={site.name} />
	<meta property="og:image" content="{site.url}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{site.name}: {site.tagline}" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="{site.url}/og.png" />
</svelte:head>

<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
	<div class="wrap">
		<a class="brand" href="/" aria-label="Home">
			<span class="brand-mark" aria-hidden="true">
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
					<path d="M4 17c3-9 7-9 9 0s5 9 7 0" />
					<path d="M4 9c3-6 7-6 9 0" opacity="0.5" />
				</svg>
			</span>
			<span class="brand-text">
				<span class="brand-name">{site.name}</span>
				<span class="brand-role">How brain MRI gets processed</span>
			</span>
		</a>

		<nav id="primary-nav" class="nav" class:open={menuOpen} aria-label="Primary">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					onclick={() => (menuOpen = false)}>{item.label}</a
				>
			{/each}
			<a
				class="btn btn-primary btn-sm"
				href="/viewer"
				aria-current={isActive('/viewer') ? 'page' : undefined}
				onclick={() => (menuOpen = false)}>Process your data</a
			>
		</nav>

		<button
			class="menu-toggle"
			aria-expanded={menuOpen}
			aria-controls="primary-nav"
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span class="sr-only">Menu</span>
			<span class="bar"></span>
			<span class="bar"></span>
		</button>
	</div>
</header>

<main id="main">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="wrap">
		<div class="foot-left">
			<p class="foot-name">{site.name}</p>
			<p class="foot-role">Written and built by {site.author.name}. Everything runs in your browser; no data is uploaded.</p>
		</div>
		<div class="foot-right">
			<a href="/diffusion">Diffusion MRI</a>
			<a href="/structural">Structural MRI</a>
			<a href="/functional">Functional MRI</a>
			<a href="/viewer">Process your data</a>
			<a href="mailto:{site.author.email}">Contact</a>
		</div>
		<p class="foot-copy">
			© {new Date().getFullYear()} {site.author.name}. Educational material, not medical advice. Demos use synthetic data unless you load your own.
		</p>
	</div>
</footer>

<style>
	/* ---------- Design tokens ---------- */
	:global(:root) {
		--paper: #f6f3ec;
		--paper-2: #efeae0;
		--ink: #121a24;
		--ink-2: #3a4553;
		--muted: #6b7482;
		--line: rgba(18, 26, 36, 0.12);
		--line-strong: rgba(18, 26, 36, 0.24);
		--accent: #0e6f8f;
		--accent-ink: #0a5570;
		--accent-soft: rgba(14, 111, 143, 0.1);
		--amber: #e0862b;
		--navy: #0b1f2e;
		--navy-2: #10304a;

		--font-display: 'Fraunces', 'Iowan Old Style', Georgia, serif;
		--font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

		--wrap: 1120px;
		--gutter: clamp(1rem, 4vw, 2rem);
		--radius: 14px;
		--radius-lg: 22px;
		--shadow: 0 1px 2px rgba(18, 26, 36, 0.04), 0 12px 32px -12px rgba(18, 26, 36, 0.18);
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	:global(html) {
		scroll-behavior: smooth;
		scroll-padding-top: 5rem;
		-webkit-text-size-adjust: 100%;
	}

	:global(body) {
		margin: 0;
		font-family: var(--font-body);
		font-size: 1.0625rem;
		line-height: 1.6;
		color: var(--ink);
		background: var(--paper);
		-webkit-font-smoothing: antialiased;
	}

	:global(h1),
	:global(h2),
	:global(h3) {
		font-family: var(--font-display);
		font-weight: 500;
		letter-spacing: -0.015em;
		line-height: 1.1;
		margin: 0;
		text-wrap: balance;
	}

	:global(p) {
		margin: 0;
	}

	:global(a) {
		color: inherit;
	}

	:global(::selection) {
		background: rgba(14, 111, 143, 0.22);
	}

	/* Shared utilities used by pages */
	:global(.wrap) {
		width: min(var(--wrap), 100% - 2 * var(--gutter));
		margin-inline: auto;
	}

	:global(.eyebrow) {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0 0 1rem;
	}

	:global(.eyebrow::before) {
		content: '';
		width: 1.5rem;
		height: 1px;
		background: currentColor;
		opacity: 0.6;
	}

	:global(.btn) {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.85rem 1.3rem;
		border-radius: 999px;
		border: 1px solid transparent;
		font: 500 0.95rem/1 var(--font-body);
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color 160ms ease,
			border-color 160ms ease,
			color 160ms ease,
			transform 160ms ease;
	}

	:global(.btn:active) {
		transform: translateY(1px);
	}

	:global(.btn-primary) {
		background: var(--ink);
		color: var(--paper);
	}

	:global(.btn-primary:hover) {
		background: var(--accent-ink);
	}

	:global(.btn-ghost) {
		border-color: var(--line-strong);
		color: var(--ink);
		background: transparent;
	}

	:global(.btn-ghost:hover) {
		border-color: var(--ink);
	}

	:global(.btn-sm) {
		padding: 0.6rem 1rem;
		font-size: 0.875rem;
	}

	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	:global(:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
		border-radius: 4px;
	}

	/* ---------- Skip link ---------- */
	.skip {
		position: absolute;
		left: 1rem;
		top: -3rem;
		background: var(--ink);
		color: var(--paper);
		padding: 0.6rem 0.9rem;
		border-radius: 8px;
		z-index: 100;
	}

	.skip:focus {
		top: 1rem;
	}

	/* ---------- Header ---------- */
	.site-header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: color-mix(in srgb, var(--paper) 82%, transparent);
		backdrop-filter: saturate(140%) blur(12px);
		border-bottom: 1px solid var(--line);
	}

	.site-header .wrap {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		height: 4.25rem;
		position: relative;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
	}

	.brand-mark {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 8px;
		background: var(--navy);
		color: var(--paper);
		display: grid;
		place-items: center;
		font: 500 0.8rem var(--font-mono);
		letter-spacing: 0.04em;
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}

	.brand-name {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 500;
	}

	.brand-role {
		font-size: 0.75rem;
		color: var(--muted);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 1.75rem;
	}

	.nav > a:not(.btn) {
		text-decoration: none;
		font-size: 0.925rem;
		font-weight: 500;
		color: var(--ink-2);
		position: relative;
	}

	.nav > a:not(.btn)::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -6px;
		height: 1px;
		background: var(--ink);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 180ms ease;
	}

	.nav > a:not(.btn):hover::after,
	.nav > a:not(.btn)[aria-current='page']::after {
		transform: scaleX(1);
	}

	.nav > a:not(.btn)[aria-current='page'] {
		color: var(--ink);
	}

	.menu-toggle {
		display: none;
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: transparent;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 5px;
		cursor: pointer;
	}

	.menu-toggle .bar {
		width: 1rem;
		height: 1.5px;
		background: var(--ink);
	}

	@media (max-width: 760px) {
		.menu-toggle {
			display: flex;
		}

		.brand-role {
			display: none;
		}

		.nav {
			position: absolute;
			left: calc(-1 * var(--gutter));
			right: calc(-1 * var(--gutter));
			top: 100%;
			flex-direction: column;
			align-items: stretch;
			gap: 0;
			background: var(--paper);
			border-bottom: 1px solid var(--line);
			padding: 0.5rem var(--gutter) 1rem;
			display: none;
		}

		.nav.open {
			display: flex;
		}

		.nav > a:not(.btn) {
			padding: 0.9rem 0;
			border-bottom: 1px solid var(--line);
		}

		.nav > a:not(.btn)::after {
			display: none;
		}

		.nav .btn {
			margin-top: 1rem;
			justify-content: center;
		}
	}

	/* ---------- Footer ---------- */
	.site-footer {
		border-top: 1px solid var(--line);
		padding: 3rem 0 2.5rem;
		margin-top: 4rem;
		color: var(--ink-2);
	}

	.site-footer .wrap {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1.5rem 3rem;
		align-items: start;
	}

	.foot-name {
		font-family: var(--font-display);
		font-size: 1.25rem;
	}

	.foot-role {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.foot-right {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.925rem;
		text-align: right;
	}

	.foot-right a {
		text-decoration: none;
		color: var(--ink-2);
	}

	.foot-right a:hover {
		color: var(--accent);
	}

	.foot-copy {
		grid-column: 1 / -1;
		font-size: 0.8rem;
		color: var(--muted);
		padding-top: 1.5rem;
		border-top: 1px solid var(--line);
	}

	@media (max-width: 600px) {
		.site-footer .wrap {
			grid-template-columns: 1fr;
		}

		.foot-right {
			text-align: left;
		}
	}
</style>
