<script lang="ts">
	import './app.css';
	import { Settings } from 'lucide-svelte';
	import ConnectionStatus from '../../components/ConnectionStatus.svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	import { CoachState } from '../../lib/coachState.svelte';

	const state = new CoachState();

	function openSettings() {
		browser.runtime.openOptionsPage();
	}
</script>

<main class="flex flex-col h-[400px]">
	<header class="flex items-center justify-between px-4 pt-4">
		<button
			type="button"
			class="p-2 rounded-lg transition-colors"
			style:color="var(--color-ink-muted)"
			on:click={openSettings}
			on:mouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-ink)')}
			on:mouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-ink-muted)')}
			title="Settings"
			aria-label="Settings"
		>
			<Settings size={16} />
		</button>
		<UpdateButton iconOnly updateFocus={() => state.refresh()} />
	</header>

	<section class="flex-1 flex items-center justify-center px-6">
		<FocusStatus
			focus={state.focus}
			agentReleaseTimeLeft={state.agentReleaseTimeLeft}
		/>
	</section>

	<footer
		class="flex items-center justify-center px-6 py-4 border-t"
		style:border-color="var(--color-line)"
	>
		<ConnectionStatus compact connected={state.connected} reconnectAt={state.reconnectAt} />
	</footer>
</main>
