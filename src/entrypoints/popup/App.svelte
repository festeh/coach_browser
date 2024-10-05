<script lang="ts">
	import './app.css';
	console.log('Popup script loaded');

	async function requestQuote() {
		try {
			await browser.runtime.sendMessage({ type: 'get_quote' });
		} catch (error) {
			console.error('Error sending quote request:', error);
		}
	}
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
