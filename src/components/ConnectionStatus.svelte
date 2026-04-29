<script lang="ts">
	import { onDestroy } from 'svelte';

	export let connected: boolean = false;
	export let reconnectAt: number = 0;
	export let compact: boolean = false;

	let countdown = 0;
	let interval: ReturnType<typeof setInterval> | null = null;

	function updateCountdown() {
		if (connected || !reconnectAt) {
			countdown = 0;
			return;
		}
		countdown = Math.max(0, Math.ceil((reconnectAt - Date.now()) / 1000));
	}

	$: if (!connected && reconnectAt) {
		updateCountdown();
		if (interval) clearInterval(interval);
		interval = setInterval(updateCountdown, 1000);
	} else if (connected || !reconnectAt) {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
		countdown = 0;
	}

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	async function handleReconnect() {
		if (!connected) {
			try {
				await browser.runtime.sendMessage({ type: 'reconnect' });
			} catch (error) {
				console.error('Error sending reconnect message:', error);
			}
		}
	}

	function statusText(connected: boolean, countdown: number): string {
		if (connected) return 'Connected';
		if (countdown > 0) return `Reconnecting in ${countdown}s`;
		return 'Reconnecting';
	}
</script>

{#if compact}
	<button
		type="button"
		class="inline-flex items-center gap-2 text-sm transition-colors"
		class:cursor-default={connected}
		class:hover:text-ink={!connected}
		on:click={handleReconnect}
		disabled={connected}
		style:color={connected ? 'var(--color-ink-muted)' : 'var(--color-bad)'}
	>
		<span
			class="inline-block w-1.5 h-1.5 rounded-full"
			class:animate-pulse={!connected}
			style:background-color={connected ? 'var(--color-good)' : 'var(--color-bad)'}
		></span>
		<span class="font-medium tabular-nums">{statusText(connected, countdown)}</span>
	</button>
{:else}
	<button
		type="button"
		class="inline-flex items-center gap-3 px-4 py-2 rounded-full text-sm font-medium transition-colors"
		class:cursor-default={connected}
		class:hover:bg-surface-3={!connected}
		on:click={handleReconnect}
		disabled={connected}
		style:background-color="var(--color-surface-2)"
		style:color="var(--color-ink)"
	>
		<span
			class="w-2 h-2 rounded-full"
			class:animate-pulse={!connected}
			style:background-color={connected ? 'var(--color-good)' : 'var(--color-bad)'}
		></span>
		<span class="tabular-nums">{statusText(connected, countdown)}</span>
	</button>
{/if}
