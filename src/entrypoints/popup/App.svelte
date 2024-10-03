<script lang="ts">
  console.log('Popup script loaded');
</script>

<main>
	<div>
		<button on:click={() => console.log('Button clicked')}>Click!</button>
	</div>
</main>

<style>
	.logo {
		height: 6em;
		padding: 1.5em;
		will-change: filter;
		transition: filter 300ms;
	}
	.logo:hover {
		filter: drop-shadow(0 0 2em #54bc4ae0);
	}
	.logo.svelte:hover {
		filter: drop-shadow(0 0 2em #ff3e00aa);
	}
	.read-the-docs {
		color: #888;
	}
</style>
