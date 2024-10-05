<script lang="ts">
	import './app.css';
	console.log('Popup script loaded');

	function requestQuote() {}
</script>

<main class="flex items-center justify-center">
	<div class="btn-large border p-4 rounded">
		<button on:click={requestQuote}>Give me a quote!</button>
	</div>
</main>

<style>
	main {
		width: 400px;
		height: 400px;
	}
</style>
