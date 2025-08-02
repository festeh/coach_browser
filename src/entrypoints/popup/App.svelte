<script lang="ts">
	import './app.css';
	import { Settings } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	console.log('Popup script loaded');

	let focus = false;
	let sinceLastChange = 0;
	// let connected = false;

	function updateFromStorage(changes: any) {
		if (changes.focusing) {
			focus = changes.focusing.newValue;
		}
		if (changes.since_last_change) {
			sinceLastChange = changes.since_last_change.newValue;
		}
	}

	onMount(async () => {
		const res = await browser.storage.local.get(['focusing', 'since_last_change', 'last_update_timestamp']);
		focus = res['focusing'];
		
		// Calculate current time if we have a timestamp
		if (res['last_update_timestamp'] && res['since_last_change'] !== undefined) {
			const now = Date.now();
			const elapsed = Math.floor((now - res['last_update_timestamp']) / 1000);
			sinceLastChange = res['since_last_change'] + elapsed;
		} else {
			sinceLastChange = res['since_last_change'] || 0;
		}

		// Listen for storage changes to auto-update the popup
		browser.storage.local.onChanged.addListener(updateFromStorage);

		// Cleanup listener when component is destroyed
		return () => {
			browser.storage.local.onChanged.removeListener(updateFromStorage);
		};
	});

	
	async function updateFocus() {
		try {
			await browser.runtime.sendMessage({ type: 'get_focus' });
			const focus_res = await browser.storage.local.get(['focusing', 'since_last_change', 'last_update_timestamp']);
			focus = focus_res['focusing'];
			
			// Calculate current time if we have a timestamp
			if (focus_res['last_update_timestamp'] && focus_res['since_last_change'] !== undefined) {
				const now = Date.now();
				const elapsed = Math.floor((now - focus_res['last_update_timestamp']) / 1000);
				sinceLastChange = focus_res['since_last_change'] + elapsed;
			} else {
				sinceLastChange = focus_res['since_last_change'] || 0;
			}
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
	<FocusStatus {focus} {sinceLastChange} />
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
