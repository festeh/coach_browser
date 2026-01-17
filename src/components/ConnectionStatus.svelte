<script lang="ts">
  export let connected: boolean = false;
</script>

<div class="flex flex-col items-center justify-center w-full max-w-lg mx-auto mb-4">
  <span class="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-sm">
    <div class="w-3 h-3 rounded-full mr-3 {connected ? 'bg-green-400' : 'bg-red-400'}"></div>
    <span class="font-medium">
      {connected ? 'Connected' : 'Disconnected'}
    </span>
  </span>
</div>
