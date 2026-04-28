<script lang="ts">
	import { formatTime } from '../lib/format';

	export let agentReleaseTimeLeft: number | null = null;

	$: locked = agentReleaseTimeLeft === null;
</script>

<div class="flex flex-col items-center justify-center w-full max-w-lg mx-auto mb-8 space-y-2">
	<span class="inline-flex items-center px-8 py-4 rounded-full bg-white/10 text-lg">
		<div class="w-4 h-4 rounded-full mr-4 {locked ? 'bg-green-400' : 'bg-red-400'}"></div>
		<span class="font-medium">
			{locked ? 'Agent locked' : 'Agent released'}
		</span>
	</span>

	{#if !locked && agentReleaseTimeLeft !== null && agentReleaseTimeLeft > 0}
		<div class="text-sm text-gray-300">
			for {formatTime(agentReleaseTimeLeft, true)}
		</div>
	{/if}
</div>
