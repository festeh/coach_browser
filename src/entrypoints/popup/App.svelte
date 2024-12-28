<script lang="ts">
	import './app.css';
	console.log('Popup script loaded');

	let focus = false;
	// let connected = false;

	onMount(async () => {
		const res = await browser.storage.local.get(['focus']);
		focus = res['focus'];
	});

	async function requestQuote() {
		try {
			await browser.runtime.sendMessage({ type: 'get_quote' });
		} catch (error) {
			console.error('Error sending quote request:', error);
		}
	}

	async function updateFocus() {
		try {
			await browser.runtime.sendMessage({ type: 'get_focus' });
			const focus_res = await browser.storage.local.get('focus');
			focus = focus_res['focus'];
		} catch (error) {
			console.error('Error sending update_focus request:', error);
		}
	}

	function openSettings() {
		browser.runtime.openOptionsPage();
	}
</script>

<main class="flex flex-col items-center justify-center">
	<div class="btn-large border p-4 mb-2 rounded">
		<button class="btn btn-primary" on:click={requestQuote}>Quote</button>
	</div>
	<button class="btn border p-2 mb-4 rounded btn-secondary" on:click={updateFocus}
		>Update focused state</button
	>
	<button class="btn border p-2 mb-4 rounded btn-secondary" on:click={openSettings}
		>Settings</button
	>

	<div class="text-lg">
		{#if focus}
			Focusing
		{:else}
			Not focusing
		{/if}
	</div>

	<!-- <div class="text-lg"> -->
	<!-- 	{#if connected} -->
	<!-- 		Connected -->
	<!-- 	{:else} -->
	<!-- 		Disconnected -->
	<!-- 	{/if} -->
	<!-- </div> -->
</main>

<style>
	main {
		width: 400px;
		height: 400px;
		background-color: #6200EE;
    color: white;
	}
</style>
