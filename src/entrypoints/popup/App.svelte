<script lang="ts">
	import './app.css';
	import { Settings } from 'lucide-svelte';
	import AgentLockStatus from '../../components/AgentLockStatus.svelte';
	import ConnectionStatus from '../../components/ConnectionStatus.svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import LastInteractionStatus from '../../components/LastInteractionStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	import { CoachState } from '../../lib/coachState.svelte';

	const state = new CoachState();

	function openSettings() {
		browser.runtime.openOptionsPage();
	}
</script>

<main class="relative flex flex-col items-center justify-center p-6">
	<button
		class="absolute top-4 right-4 p-2 hover:bg-white/10 transition-colors rounded-lg text-white"
		on:click={openSettings}
		title="Settings"
	>
		<Settings size={20} />
	</button>
	<ConnectionStatus connected={state.connected} reconnectAt={state.reconnectAt} />
	<FocusStatus focus={state.focus} sinceLastChange={state.sinceLastChange} />
	<AgentLockStatus agentReleaseTimeLeft={state.agentReleaseTimeLeft} />
	<LastInteractionStatus lastInteraction={state.lastInteraction} />
	<UpdateButton updateFocus={() => state.refresh()} />
</main>

<style>
	main {
		width: 400px;
		min-height: 400px;
		background-color: #2d3748;
		color: white;
	}
</style>
