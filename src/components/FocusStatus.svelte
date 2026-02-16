<script lang="ts">
	import { formatTime } from '../lib/format';

	export let focus: boolean;
	export let sinceLastChange: number = 0;
</script>

<div class="flex flex-col items-center justify-center w-full max-w-lg mx-auto mb-8 space-y-2">
	<span class="inline-flex items-center px-8 py-4 rounded-full bg-white/10 text-lg">
		<div class="w-4 h-4 rounded-full mr-4 {focus ? 'bg-green-400' : 'bg-red-400'}"></div>
		<span class="font-medium">
			{focus ? 'Focusing' : 'Not focusing'}
		</span>
	</span>
	
	{#if sinceLastChange > 0}
		<div class="text-sm text-gray-300">
			for {formatTime(sinceLastChange, true)}
		</div>
	{/if}
</div>