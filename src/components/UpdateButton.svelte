<script lang="ts">
	export let updateFocus: () => void;
</script>

<div class="flex items-center justify-center w-full max-w-lg mx-auto">
	<button
		class="py-4 px-8 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white text-lg font-medium shadow-sm min-w-[160px]"
		on:click={updateFocus}
	>
		Update
	</button>
</div>