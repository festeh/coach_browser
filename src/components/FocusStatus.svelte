<script lang="ts">
	export let focus: boolean;
</script>

<div class="flex items-center justify-center w-full max-w-lg mx-auto mb-8">
	<span class="inline-flex items-center px-8 py-4 rounded-full bg-white/10 text-lg">
		<div class="w-4 h-4 rounded-full mr-4 {focus ? 'bg-green-400' : 'bg-red-400'}"></div>
		<span class="font-medium">
			{focus ? 'Focusing' : 'Not focusing'}
		</span>
	</span>
</div>