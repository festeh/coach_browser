<script lang="ts">
	import { RotateCw } from 'lucide-svelte';

	export let updateFocus: () => void;
	export let iconOnly: boolean = false;
</script>

{#if iconOnly}
	<button
		type="button"
		class="p-2 rounded-lg transition-colors"
		style:color="var(--color-ink-muted)"
		on:click={updateFocus}
		on:mouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-ink)')}
		on:mouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-ink-muted)')}
		title="Refresh"
		aria-label="Refresh"
	>
		<RotateCw size={16} />
	</button>
{:else}
	<button
		type="button"
		class="inline-flex items-center gap-2 text-sm font-medium transition-colors"
		style:color="var(--color-ink-muted)"
		on:click={updateFocus}
		on:mouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-accent)')}
		on:mouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-ink-muted)')}
	>
		<RotateCw size={14} />
		<span>Refresh</span>
	</button>
{/if}
