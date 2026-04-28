<script lang="ts">
	import './app.css';
	import { onMount } from 'svelte';
	import { X } from 'lucide-svelte';
	import AgentLockStatus from '../../components/AgentLockStatus.svelte';
	import ConnectionStatus from '../../components/ConnectionStatus.svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import LastInteractionStatus from '../../components/LastInteractionStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	import { CoachState } from '../../lib/coachState.svelte';
	import { getStorage, setStorage } from '../../lib/storage';

	const state = new CoachState();

	let redirectUrl = '';
	let redirectError = '';
	let redirectSaved = false;
	let redirectSavedTimer: ReturnType<typeof setTimeout> | null = null;
	let whitelist: string[] = [];
	let newSites = '';
	let copyButtonText = 'Copy';

	function normalizeRedirectUrl(value: string): string {
		const trimmed = value.trim();
		if (!trimmed) return '';
		if (/^https?:\/\//i.test(trimmed)) return trimmed;
		return `https://${trimmed}`;
	}

	function parseUrl(value: string): URL | null {
		if (!value) return null;
		try {
			const url = new URL(value);
			return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
		} catch {
			return null;
		}
	}

	function flashSaved() {
		redirectSaved = true;
		if (redirectSavedTimer) clearTimeout(redirectSavedTimer);
		redirectSavedTimer = setTimeout(() => { redirectSaved = false; }, 1800);
	}

	async function saveRedirectUrl() {
		const normalized = normalizeRedirectUrl(redirectUrl);
		if (normalized && !parseUrl(normalized)) {
			redirectError = 'Please enter a valid URL';
			return;
		}
		redirectError = '';
		redirectUrl = normalized;
		await setStorage({ redirect_url: normalized });
		flashSaved();
	}

	async function clearRedirectUrl() {
		redirectUrl = '';
		redirectError = '';
		await setStorage({ redirect_url: '' });
		flashSaved();
	}

	async function addSites() {
		const sites = newSites
			.split('\n')
			.filter(site => site.trim() !== '')
			.map(site => site.replace('*.', '').trim());

		whitelist = [...new Set([...whitelist, ...sites])];
		await setStorage({ whitelist });
		newSites = '';
	}

	async function removeSite(site: string) {
		whitelist = whitelist.filter(item => item !== site);
		await setStorage({ whitelist });
	}

	async function clearWhitelist() {
		if (confirm('Are you sure you want to clear the entire whitelist?')) {
			whitelist = [];
			newSites = '';
			await setStorage({ whitelist: [] });
		}
	}

	async function copyWhitelist() {
		await navigator.clipboard.writeText(whitelist.join('\n'));
		copyButtonText = 'Copied!';
		setTimeout(() => { copyButtonText = 'Copy'; }, 1500);
	}

	onMount(async () => {
		const data = await getStorage('redirect_url', 'whitelist');
		redirectUrl = data.redirect_url;
		whitelist = data.whitelist;
	});
</script>

<main>
	<h1 class="text-2xl font-normal mb-6 text-[#64b5f6]">Options</h1>

	<div class="card">
		<h2 class="text-xl font-normal mb-4 text-[#e0e0e0]">Status</h2>
		<ConnectionStatus connected={state.connected} reconnectAt={state.reconnectAt} />
		<FocusStatus focus={state.focus} sinceLastChange={state.sinceLastChange} />
		<AgentLockStatus agentReleaseTimeLeft={state.agentReleaseTimeLeft} />
		<LastInteractionStatus lastInteraction={state.lastInteraction} />
		<UpdateButton updateFocus={() => state.refresh()} />
	</div>

	<div class="card">
		<h2 class="text-xl font-normal mb-4 text-[#e0e0e0]">Redirect URL</h2>
		<p class="text-sm text-[#9e9e9e] mb-4">
			URL to redirect to when a non-whitelisted site is blocked. Leave empty to show an alert instead.
		</p>
		<form on:submit|preventDefault={saveRedirectUrl}>
			<div class="mb-4">
				<input
					type="text"
					bind:value={redirectUrl}
					placeholder="example.com"
					class="input-field"
				/>
			</div>
			{#if redirectError}
				<p class="text-sm text-red-400 mb-2">{redirectError}</p>
			{/if}
			<div class="flex gap-2 mt-4 items-center">
				<button class="btn btn-primary" type="submit">Save</button>
				<button class="btn btn-secondary" type="button" on:click={clearRedirectUrl}>Clear</button>
				{#if redirectSaved}
					<span class="text-sm text-green-400 saved-indicator">Saved</span>
				{/if}
			</div>
		</form>
	</div>

	<div class="card">
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-xl font-normal text-[#e0e0e0]">Whitelist</h2>
			<button class="btn btn-secondary" type="button" on:click={copyWhitelist}>{copyButtonText}</button>
		</div>
		<form on:submit|preventDefault={addSites}>
			<div class="mb-4">
				<textarea
					bind:value={newSites}
					placeholder="Enter whitelisted sites (one per line)"
					class="textarea-field"
				></textarea>
			</div>
			<div class="flex gap-2 mt-4">
				<button class="btn btn-primary" type="submit">Save</button>
				<button class="btn btn-secondary" type="button" on:click={clearWhitelist}>Clear</button>
			</div>
		</form>

		{#if whitelist.length > 0}
			<ul class="list-none p-0 mt-4 space-y-1">
				{#each whitelist as site}
					<li class="flex items-center justify-between bg-[#2a2a2a] rounded">
						<span class="px-4 py-2 truncate">{site}</span>
						<button
							class="flex items-center justify-center p-2 mr-2 text-[#9e9e9e] hover:text-red-400 hover:bg-white/10 rounded-full transition-colors"
							on:click={() => removeSite(site)}
						>
							<X size={18} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</main>

<style>
	main {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		background-color: #121212;
		color: #e0e0e0;
		min-height: 100vh;
	}

	:global(body) {
		margin: 0;
		background-color: #121212;
	}

	.card {
		background: #1e1e1e;
		border-radius: 8px;
		padding: 24px;
		margin-bottom: 24px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}

	.input-field {
		width: 100%;
		padding: 12px;
		border: 1px solid #333;
		border-radius: 4px;
		font-size: 14px;
		box-sizing: border-box;
		background-color: #2a2a2a;
		color: #e0e0e0;
	}

	.input-field::placeholder {
		color: #757575;
	}

	.input-field:focus {
		outline: none;
		border-color: #64b5f6;
		box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
	}

	.textarea-field {
		width: 100%;
		min-height: 200px;
		padding: 12px;
		border: 2px solid #333;
		border-radius: 4px;
		font-family: inherit;
		font-size: 16px;
		line-height: 1.5;
		resize: vertical;
		background-color: #2a2a2a;
		color: #e0e0e0;
		box-sizing: border-box;
	}

	.textarea-field:focus {
		outline: none;
		border-color: #64b5f6;
	}

	.textarea-field::placeholder {
		color: #757575;
	}

	.btn {
		padding: 8px 16px;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		border: none;
	}

	.btn-primary {
		background-color: #2196f3;
		color: white;
	}

	.btn-primary:hover {
		background-color: #42a5f5;
	}

	.btn-secondary {
		background-color: transparent;
		border: 1px solid #64b5f6;
		color: #64b5f6;
	}

	.btn-secondary:hover {
		background-color: rgba(100, 181, 246, 0.15);
	}

	.saved-indicator {
		animation: saved-fade 1.8s ease-out forwards;
	}

	@keyframes saved-fade {
		0% { opacity: 0; transform: translateY(2px); }
		15% { opacity: 1; transform: translateY(0); }
		80% { opacity: 1; }
		100% { opacity: 0; }
	}
</style>
