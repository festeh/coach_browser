import { onMount } from 'svelte';
import { getStorage, onStorageChanged, type StorageChanges } from './storage';

export class CoachState {
	focus = $state(false);
	connected = $state(false);
	reconnectAt = $state(0);
	agentReleaseTimeLeft = $state<number | null>(null);

	constructor() {
		onMount(() => {
			let active = true;

			getStorage(
				'focusing',
				'connected',
				'reconnect_at',
				'agent_release_time_left'
			).then((res) => {
				if (!active) return;
				this.focus = res.focusing;
				this.connected = res.connected;
				this.reconnectAt = res.reconnect_at;
				this.agentReleaseTimeLeft = res.agent_release_time_left;
			});

			const unsubscribe = onStorageChanged(async (changes: StorageChanges) => {
				if (changes.focusing) this.focus = changes.focusing.newValue;
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
