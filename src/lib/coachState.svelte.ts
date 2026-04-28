import { onMount } from 'svelte';
import { getStorage, onStorageChanged, type StorageChanges } from './storage';

function calculateElapsedTime(baseValue: number, timestamp: number): number {
	if (!timestamp || baseValue === undefined) return baseValue || 0;
	return baseValue + Math.floor((Date.now() - timestamp) / 1000);
}

export class CoachState {
	focus = $state(false);
	sinceLastChange = $state(0);
	lastInteraction = $state(0);
	connected = $state(false);
	reconnectAt = $state(0);
	agentReleaseTimeLeft = $state<number | null>(null);

	constructor() {
		onMount(() => {
			let active = true;

			getStorage(
				'focusing',
				'since_last_change',
				'last_interaction',
				'last_interaction_timestamp',
				'last_update_timestamp',
				'connected',
				'reconnect_at',
				'agent_release_time_left'
			).then((res) => {
				if (!active) return;
				this.focus = res.focusing;
				this.connected = res.connected;
				this.reconnectAt = res.reconnect_at;
				this.agentReleaseTimeLeft = res.agent_release_time_left;
				this.sinceLastChange = calculateElapsedTime(res.since_last_change, res.last_update_timestamp);
				this.lastInteraction = calculateElapsedTime(res.last_interaction, res.last_interaction_timestamp);
			});

			const unsubscribe = onStorageChanged(async (changes: StorageChanges) => {
				if (changes.focusing) this.focus = changes.focusing.newValue;
				if (changes.since_last_change) this.sinceLastChange = changes.since_last_change.newValue;
				if (changes.last_interaction) this.lastInteraction = changes.last_interaction.newValue;
				if (changes.last_interaction_timestamp) {
					const r = await getStorage('last_interaction', 'last_interaction_timestamp');
					if (!active) return;
					this.lastInteraction = calculateElapsedTime(r.last_interaction, r.last_interaction_timestamp);
				}
				if (changes.connected) this.connected = changes.connected.newValue;
				if (changes.reconnect_at) this.reconnectAt = changes.reconnect_at.newValue;
				if (changes.agent_release_time_left) this.agentReleaseTimeLeft = changes.agent_release_time_left.newValue;
			});

			return () => {
				active = false;
				unsubscribe();
			};
		});
	}

	async refresh(): Promise<void> {
		try {
			await browser.runtime.sendMessage({ type: 'get_focus' });
		} catch (error) {
			console.error('Error sending get_focus request:', error);
		}
	}
}
