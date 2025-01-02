<script lang="ts">
	import './app.css';
	import { Settings } from 'lucide-svelte';
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

<main class="relative flex flex-col items-center justify-center p-6">
	<button 
		class="absolute top-4 right-4 p-2 hover:bg-white/10 transition-colors rounded-lg text-white"
		on:click={openSettings}
		title="Settings"
	>
		<Settings size={20} />
	</button>
	<div class="w-full max-w-sm space-y-4">
		<button 
			class="w-full py-3 px-6 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white font-medium shadow-sm" 
			on:click={requestQuote}
		>
			Get Quote
		</button>


		<div class="flex items-center justify-between gap-4">
			<span class="inline-flex items-center px-4 py-2 rounded-full bg-white/10">
				<div class="w-2 h-2 rounded-full mr-2 {focus ? 'bg-green-400' : 'bg-red-400'}"></div>
				<span class="text-sm font-medium">
					{focus ? 'Focusing' : 'Not focusing'}
				</span>
			</span>
			
			<button 
				class="py-2 px-4 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white text-sm font-medium shadow-sm"
				on:click={updateFocus}
			>
				Update
			</button>
		</div>
	</div>

</main>

<style>
	main {
		width: 400px;
		height: 400px;
		background-color: #2D3748;
		color: white;
	}
</style>
