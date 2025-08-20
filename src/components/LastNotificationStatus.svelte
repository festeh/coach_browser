<script lang="ts">
	export let lastNotificationSent: number = 0;

	function formatTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	}
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