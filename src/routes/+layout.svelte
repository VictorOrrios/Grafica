<script lang="ts">
	import '../app.css';
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="favicon.ico" />
</svelte:head>

{@render children?.()}
