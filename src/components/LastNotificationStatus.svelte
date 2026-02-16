<script lang="ts">
	import { formatTime } from '../lib/format';

	export let lastNotificationSent: number = 0;
</script>

<div class="flex flex-col items-center justify-center w-full max-w-lg mx-auto mb-8 space-y-2">
	<span class="inline-flex items-center px-8 py-4 rounded-full bg-white/10 text-lg">
		<div class="w-4 h-4 rounded-full mr-4 bg-yellow-400"></div>
		<span class="font-medium">
			Last notification
		</span>
	</span>
	
	{#if lastNotificationSent > 0}
		<div class="text-sm text-gray-300">
			{formatTime(lastNotificationSent)} ago
		</div>
	{:else}
		<div class="text-sm text-gray-300">
			No notification sent
		</div>
	{/if}
</div>