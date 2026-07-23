<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#0f4c81" />
	<meta property="og:locale" content="en_US" />
</svelte:head>

{@render children()}
