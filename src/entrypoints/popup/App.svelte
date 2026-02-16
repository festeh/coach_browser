<script lang="ts">
	import './app.css';
	import { Settings } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ConnectionStatus from '../../components/ConnectionStatus.svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import LastInteractionStatus from '../../components/LastInteractionStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	import { getStorage, onStorageChanged, type StorageChanges, type StorageSchema } from '../../lib/storage';

	let focus = false;
	let sinceLastChange = 0;
	let lastInteraction = 0;
	let connected = false;

	function calculateElapsedTime(baseValue: number, timestamp: number): number {
		if (!timestamp || baseValue === undefined) {
			return baseValue || 0;
		}
		const now = Date.now();
		const elapsed = Math.floor((now - timestamp) / 1000);
		return baseValue + elapsed;
	}

	function updateTimesFromStorage(data: Partial<StorageSchema>) {
		sinceLastChange = calculateElapsedTime(data.since_last_change ?? 0, data.last_update_timestamp ?? 0);
		lastInteraction = calculateElapsedTime(data.last_interaction ?? 0, data.last_interaction_timestamp ?? 0);
	}

	async function handleStorageChange(changes: StorageChanges) {
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
			const res = await getStorage('last_interaction', 'last_interaction_timestamp');
			lastInteraction = calculateElapsedTime(res.last_interaction, res.last_interaction_timestamp);
		}
		if (changes.connected) {
			connected = changes.connected.newValue;
		}
	}

	onMount(async () => {
		const res = await getStorage('focusing', 'since_last_change', 'last_interaction', 'last_interaction_timestamp', 'last_update_timestamp', 'connected');
		focus = res.focusing;
		connected = res.connected;
		updateTimesFromStorage(res);

		return onStorageChanged(handleStorageChange);
	});

	async function updateFocus() {
		try {
			await browser.runtime.sendMessage({ type: 'get_focus' });
			const res = await getStorage('focusing', 'since_last_change', 'last_interaction', 'last_interaction_timestamp', 'last_update_timestamp');
			focus = res.focusing;
			updateTimesFromStorage(res);
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
	<ConnectionStatus {connected} />
	<FocusStatus {focus} {sinceLastChange} />
	<LastInteractionStatus {lastInteraction} />
	<UpdateButton {updateFocus} />
</main>

<style>
	main {
		width: 400px;
		min-height: 400px;
		background-color: #2d3748;
		color: white;
	}
</style>
