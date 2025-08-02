<script lang="ts">
	import './app.css';
	import { Settings } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import LastInteractionStatus from '../../components/LastInteractionStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	import { showNotification } from '../../lib/notifications';
	console.log('Popup script loaded');

	let focus = false;
	let sinceLastChange = 0;
	let lastInteraction = 0;
	// let connected = false;

	function calculateElapsedTime(baseValue: number, timestamp: number): number {
		if (!timestamp || baseValue === undefined) {
			return baseValue || 0;
		}
		const now = Date.now();
		const elapsed = Math.floor((now - timestamp) / 1000);
		return baseValue + elapsed;
	}

	async function updateTimesFromStorage(data: any) {
		sinceLastChange = calculateElapsedTime(data.since_last_change, data.last_update_timestamp);
		lastInteraction = calculateElapsedTime(data.last_interaction, data.last_interaction_timestamp);
	}

	function updateFromStorage(changes: any) {
		if (changes.focusing) {
			focus = changes.focusing.newValue;
		}
		if (changes.since_last_change) {
			sinceLastChange = changes.since_last_change.newValue;
		}
		if (changes.last_interaction) {
			lastInteraction = changes.last_interaction.newValue;
		}
		if (changes.last_interaction_timestamp) {
			browser.storage.local.get(['last_interaction', 'last_interaction_timestamp']).then((res) => {
				lastInteraction = calculateElapsedTime(res.last_interaction, res.last_interaction_timestamp);
			});
		}
	}

	onMount(async () => {
		const res = await browser.storage.local.get(['focusing', 'since_last_change', 'last_interaction', 'last_interaction_timestamp', 'last_update_timestamp']);
		focus = res.focusing;
		updateTimesFromStorage(res);

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
			const focus_res = await browser.storage.local.get(['focusing', 'since_last_change', 'last_interaction', 'last_interaction_timestamp', 'last_update_timestamp']);
			focus = focus_res.focusing;
			updateTimesFromStorage(focus_res);
		} catch (error) {
			console.error('Error sending update_focus request:', error);
		}
	}

	function openSettings() {
		browser.runtime.openOptionsPage();
	}

	function handleNotification() {
		showNotification();
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
	<LastInteractionStatus {lastInteraction} />
	<UpdateButton {updateFocus} />
	<button
		class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors rounded-lg text-white"
		on:click={handleNotification}
	>
		Show Notification
	</button>
</main>

<style>
	main {
		width: 400px;
		height: 400px;
		background-color: #2d3748;
		color: white;
	}
</style>
