<script lang="ts">
	import './app.css';
	import { onMount } from 'svelte';
	import { X } from 'lucide-svelte';
	import { getStorage, setStorage } from '../../lib/storage';

	let redirectUrl = '';
	let redirectError = '';
	let whitelist: string[] = [];
	let newSites = '';
	let copyButtonText = 'Copy';

	function isValidUrl(value: string): boolean {
		if (!value) return true;
		try {
			const url = new URL(value);
			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	}

	async function saveRedirectUrl() {
		const url = redirectUrl.trim();
		if (!isValidUrl(url)) {
			redirectError = 'Please enter a valid URL (must start with http:// or https://)';
			return;
		}
		redirectError = '';
		await setStorage({ redirect_url: url });
	}

	async function clearRedirectUrl() {
		redirectUrl = '';
		redirectError = '';
		await setStorage({ redirect_url: '' });
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
		<h2 class="text-xl font-normal mb-4 text-[#e0e0e0]">Redirect URL</h2>
		<p class="text-sm text-[#9e9e9e] mb-4">
			URL to redirect to when a non-whitelisted site is blocked. Leave empty to show an alert instead.
		</p>
		<form on:submit|preventDefault={saveRedirectUrl}>
			<div class="mb-4">
				<input
					type="url"
					bind:value={redirectUrl}
					placeholder="https://example.com"
					class="input-field"
				/>
			</div>
			{#if redirectError}
				<p class="text-sm text-red-400 mb-2">{redirectError}</p>
			{/if}
			<div class="flex gap-2 mt-4">
				<button class="btn btn-primary" type="submit">Save</button>
				<button class="btn btn-secondary" type="button" on:click={clearRedirectUrl}>Clear</button>
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
</style>
