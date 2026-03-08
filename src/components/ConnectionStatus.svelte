<script lang="ts">
  import { onDestroy } from 'svelte';

  export let connected: boolean = false;
  export let reconnectAt: number = 0;

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
    if (interval) { clearInterval(interval); interval = null; }
    countdown = 0;
  }

  onDestroy(() => { if (interval) clearInterval(interval); });

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

<div class="flex flex-col items-center justify-center w-full max-w-lg mx-auto mb-4">
  <button
    class="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-sm {!connected ? 'cursor-pointer hover:bg-white/20' : 'cursor-default'}"
    on:click={handleReconnect}
    disabled={connected}
  >
    <div class="w-3 h-3 rounded-full mr-3 {connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}"></div>
    <span class="font-medium">
      {statusText(connected, countdown)}
    </span>
  </button>
</div>
