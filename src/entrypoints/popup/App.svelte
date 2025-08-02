<script lang="ts">
	import './app.css';
	import { Settings } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	console.log('Popup script loaded');

	let focus = false;
	// let connected = false;

	onMount(async () => {
		const res = await browser.storage.local.get(['focus']);
		focus = res['focus'];
	});

	
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
	<FocusStatus {focus} />
	<UpdateButton {updateFocus} />
</main>

<style>
	main {
		width: 400px;
		height: 400px;
		background-color: #2d3748;
		color: white;
	}
</style>
