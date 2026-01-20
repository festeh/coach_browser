<script lang="ts">
  export let connected: boolean = false;

  async function handleReconnect() {
    if (!connected) {
      try {
        await browser.runtime.sendMessage({ type: 'reconnect' });
      } catch (error) {
        console.error('Error sending reconnect message:', error);
      }
    }
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
      {connected ? 'Connected' : 'Disconnected - Click to reconnect'}
    </span>
  </button>
</div>
