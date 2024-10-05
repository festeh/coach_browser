<script lang="ts">
	import './app.css';
	console.log('Popup script loaded');

	let focus = false;
	browser.storage.local.get('focus').then((value) => {
		focus = value['focus'];
	});

	async function requestQuote() {
		try {
			await browser.runtime.sendMessage({ type: 'get_quote' });
		} catch (error) {
			console.error('Error sending quote request:', error);
		}
	}
</script>

<main class="flex flex-col items-center justify-center">
	<div class="btn-large border p-4 mb-4 rounded">
		<button on:click={requestQuote}>Give me a quote!</button>
	</div>

	<div class="text-lg">Focus mode: {focus}</div>
</main>

<style>
	main {
		width: 400px;
		height: 400px;
	}
</style>
