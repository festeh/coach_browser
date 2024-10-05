<script lang="ts">
	import './app.css';
	import { sendMessage } from 'wxt/messaging';
	console.log('Popup script loaded');

	async function requestQuote() {
		try {
			await sendMessage('get_quote');
			console.log('Quote request sent');
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
