<script lang="ts">
	import './app.css';
	import { onMount, onDestroy } from 'svelte';
	import { Check, Copy, X, FolderOpen, RefreshCw } from 'lucide-svelte';
	import {
		editMode as detectEditMode,
		type EditMode,
		getConnectedHandle,
		connectFile,
		addSite,
		removeSite
	} from '../../lib/whitelistFile';
	import ConnectionStatus from '../../components/ConnectionStatus.svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	import { CoachState } from '../../lib/coachState.svelte';
	import { getStorage, setStorage, onStorageChanged } from '../../lib/storage';

	// Runes mode on purpose: a `$:` here flips the component to legacy mode,
	// whose templates don't subscribe to runes-class signals — the header
	// froze on CoachState exactly that way once.
	const coach = new CoachState();
	const isFirefox = import.meta.env.BROWSER === 'firefox';

	let mode = $state<EditMode>('none');
	let fileConnected = $state(false);
	let reloaded = $state(false);
	let newSite = $state('');
	let redirectUrl = $state('');
	let redirectError = $state('');
	let redirectSaved = $state(false);
	let redirectSavedTimer: ReturnType<typeof setTimeout> | null = null;
	let whitelist = $state<string[]>([]);
	let copied = $state(false);
	let copiedTimer: ReturnType<typeof setTimeout> | null = null;

	const canEdit = $derived(mode === 'host' || (mode === 'picker' && fileConnected));

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
		redirectSavedTimer = setTimeout(() => {
			redirectSaved = false;
		}, 1800);
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

	async function copyWhitelist() {
		await navigator.clipboard.writeText(whitelist.join('\n'));
		copied = true;
		if (copiedTimer) clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => {
			copied = false;
		}, 1500);
	}

	// The whitelist is file-owned (see the paths below) and synced into
	// storage by the background; this page only displays it, live.
	const unsubscribe = onStorageChanged((changes) => {
		if (changes.whitelist) whitelist = changes.whitelist.newValue ?? [];
	});
	onDestroy(unsubscribe);

	// Raw connection evidence, bypassing CoachState: what storage holds vs
	// what the background's live socket says. Kept visible — it has already
	// earned its place once.
	let diag = $state('');
	async function refreshDiag() {
		let stored: unknown;
		try {
			stored = (await browser.storage.local.get('connected')).connected;
		} catch (e) {
			stored = `ERR ${e}`;
		}
		let live = '';
		try {
			live = JSON.stringify(await browser.runtime.sendMessage({ type: 'get_connection' }));
		} catch (e) {
			live = `ERR ${e}`;
		}
		let multi = '';
		try {
			// The exact read CoachState does, to spot a multi-key difference.
			const res = await getStorage('focusing', 'connected', 'reconnect_at', 'agent_release_time_left');
			multi = JSON.stringify(res);
		} catch (e) {
			multi = `ERR ${e}`;
		}
		diag =
			`storage.connected=${JSON.stringify(stored)} · live=${live}` +
			` · coachState.connected=${coach.connected} · multi=${multi} · build ${__BUILD_DATE__}`;
	}

	onMount(() => {
		void (async () => {
			const data = await getStorage('redirect_url', 'whitelist');
			redirectUrl = data.redirect_url;
			whitelist = data.whitelist;
			mode = await detectEditMode();
			if (mode === 'picker') fileConnected = (await getConnectedHandle()) !== null;
			void refreshDiag();
		})();
		const diagTimer = setInterval(refreshDiag, 5000);
		return () => clearInterval(diagTimer);
	});

	async function reloadFromFile() {
		await browser.runtime.sendMessage({ type: 'sync_whitelist' });
		reloaded = true;
		setTimeout(() => (reloaded = false), 1500);
	}

	async function connect() {
		try {
			await connectFile();
			fileConnected = true;
		} catch {
			// Picker dismissed — nothing to do.
		}
	}

	async function addNewSite() {
		const host = newSite.trim().replace(/^\*\./, '');
		if (!host) return;
		if (await addSite(host)) newSite = '';
	}
</script>

<main class="mx-auto max-w-[640px] px-8 py-12">
	<header class="flex items-start justify-between gap-8 mb-12">
		<div>
			<div
				class="text-[11px] font-medium uppercase tracking-[0.2em] mb-2"
				style:color="var(--color-accent)"
			>
				Coach
			</div>
			<h1 class="text-4xl font-extralight tracking-tight" style:color="var(--color-ink)">
				Settings
			</h1>
		</div>

		<div class="flex flex-col items-end gap-2 pt-2">
			<FocusStatus
				compact
				focus={coach.focus}
				agentReleaseTimeLeft={coach.agentReleaseTimeLeft}
			/>
			<ConnectionStatus connected={coach.connected} reconnectAt={coach.reconnectAt} />
			<UpdateButton updateFocus={() => coach.refresh()} />
		</div>
	</header>

	{#if diag}
		<p class="-mt-8 mb-6 text-[11px] font-mono break-all" style:color="var(--color-ink-subtle)">
			{diag}
		</p>
	{/if}

	<section class="py-8 border-t" style:border-color="var(--color-line)">
		<div class="flex items-baseline justify-between mb-2">
			<h2 class="text-xl font-medium tracking-tight" style:color="var(--color-ink)">
				Redirect when blocked
			</h2>
		</div>
		<p class="text-sm mb-5 max-w-[60ch]" style:color="var(--color-ink-muted)">
			Where to send the user when they hit a site that isn't whitelisted. Leave empty to open
			the coach chat instead — where the plea and the override live.
		</p>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				saveRedirectUrl();
			}}
			class="space-y-3"
		>
			<input
				type="text"
				bind:value={redirectUrl}
				placeholder="example.com"
				class="input"
			/>
			{#if redirectError}
				<p class="text-sm" style:color="var(--color-bad)">{redirectError}</p>
			{/if}
			<div class="flex items-center gap-3">
				<button class="btn btn-primary" type="submit">Save</button>
				<button class="btn btn-ghost" type="button" onclick={clearRedirectUrl}>Clear</button>
				{#if redirectSaved}
					<span
						class="inline-flex items-center gap-1 text-sm saved-indicator"
						style:color="var(--color-good)"
					>
						<Check size={14} /> Saved
					</span>
				{/if}
			</div>
		</form>
	</section>

	<section class="py-8 border-t" style:border-color="var(--color-line)">
		<div class="flex items-baseline justify-between mb-2 gap-4">
			<h2 class="text-xl font-medium tracking-tight flex items-baseline gap-2" style:color="var(--color-ink)">
				<span>Whitelist</span>
				{#if whitelist.length > 0}
					<span class="text-sm font-normal tabular-nums" style:color="var(--color-ink-subtle)">
						· {whitelist.length} {whitelist.length === 1 ? 'site' : 'sites'}
					</span>
				{/if}
			</h2>
			<div class="flex items-center gap-4">
				<button
					class="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
					style:color={reloaded ? 'var(--color-good)' : 'var(--color-ink-muted)'}
					onclick={reloadFromFile}
					title="Re-read the whitelist file now"
				>
					{#if reloaded}
						<Check size={14} /> Reloaded
					{:else}
						<RefreshCw size={14} /> Reload
					{/if}
				</button>
			{#if whitelist.length > 0}
				<button
					class="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
					style:color={copied ? 'var(--color-good)' : 'var(--color-ink-muted)'}
					onclick={copyWhitelist}
					onmouseenter={(e) => {
						if (!copied)
							(e.currentTarget as HTMLElement).style.color = 'var(--color-ink)';
					}}
					onmouseleave={(e) => {
						if (!copied)
							(e.currentTarget as HTMLElement).style.color = 'var(--color-ink-muted)';
					}}
				>
					{#if copied}
						<Check size={14} /> Copied
					{:else}
						<Copy size={14} /> Copy
					{/if}
				</button>
			{/if}
			</div>
		</div>
		<p class="text-sm mb-5 max-w-[60ch]" style:color="var(--color-ink-muted)">
			Sites you're allowed to use while focusing. Anything else gets blocked or redirected. Each
			browser owns its own text file — one hostname per line, <code>#</code> for comments — and
			syncs only from it.
		</p>

		<div class="rounded-lg border divide-y" style:border-color="var(--color-line)">
			{#if isFirefox}
				<div class="px-4 py-3">
					<div
						class="text-[11px] font-medium uppercase tracking-[0.15em] mb-1"
						style:color="var(--color-ink-subtle)"
					>
						This browser's file · Firefox
					</div>
					<code class="text-[13px] break-all" style:color="var(--color-ink)">
						{__WHITELIST_FIREFOX_SOURCE__}
					</code>
					<p class="text-xs mt-1" style:color="var(--color-ink-subtle)">
						{#if mode === 'host'}
							Edit and save — applies automatically within ~30 s (read via the native host).
						{:else}
							Edit this, then <code>npm run install:browsers</code>; restart Firefox to apply.
						{/if}
					</p>
				</div>
			{:else}
				<div class="px-4 py-3">
					<div
						class="text-[11px] font-medium uppercase tracking-[0.15em] mb-1"
						style:color="var(--color-ink-subtle)"
					>
						This browser's file · Chrome
					</div>
					<code class="text-[13px] break-all" style:color="var(--color-ink)">
						{__WHITELIST_CHROME_SOURCE__}
					</code>
					<p class="text-xs mt-1" style:color="var(--color-ink-subtle)">
						Edit and save — applies automatically within ~30 s. No build needed: Chrome
						reads this file through a symlink.
					</p>
				</div>
			{/if}
		</div>

		{#if canEdit}
			<form
				class="mt-4 flex items-center gap-3"
				onsubmit={(e) => {
					e.preventDefault();
					addNewSite();
				}}
			>
				<input
					type="text"
					class="input flex-1"
					bind:value={newSite}
					placeholder="example.com"
				/>
				<button class="btn btn-primary" type="submit" disabled={!newSite.trim()}>Add</button>
			</form>
		{:else if mode === 'picker'}
			<button
				type="button"
				class="btn btn-ghost mt-4 inline-flex items-center gap-2"
				onclick={connect}
			>
				<FolderOpen size={14} />
				Connect the file to edit from here
			</button>
		{/if}

		{#if whitelist.length > 0}
			<ul class="mt-6 divide-y divide-line">
				{#each whitelist as site}
					<li class="group flex items-center justify-between py-2.5">
						<span class="text-[15px] tabular-nums truncate" style:color="var(--color-ink)">
							{site}
						</span>
						{#if canEdit}
							<button
								type="button"
								class="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md transition-all"
								style:color="var(--color-ink-subtle)"
								onclick={() => removeSite(site)}
								onmouseenter={(e) => {
									(e.currentTarget as HTMLElement).style.color = 'var(--color-bad)';
								}}
								onmouseleave={(e) => {
									(e.currentTarget as HTMLElement).style.color = 'var(--color-ink-subtle)';
								}}
								aria-label={`Remove ${site} from the file`}
							>
								<X size={16} />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-6 text-sm" style:color="var(--color-ink-subtle)">
				The whitelist is empty — nothing is allowed while focusing.
			</p>
		{/if}
	</section>
</main>

<style>
	.input {
		width: 100%;
		padding: 12px 14px;
		border: 1px solid var(--color-line);
		border-radius: 8px;
		font-size: 14px;
		font-family: inherit;
		background-color: var(--color-surface-2);
		color: var(--color-ink);
		box-sizing: border-box;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.input::placeholder {
		color: var(--color-ink-subtle);
	}

	.input:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px var(--color-accent-soft);
	}

	.textarea {
		min-height: 120px;
		font-size: 14px;
		line-height: 1.6;
		resize: vertical;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.btn {
		padding: 9px 18px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.15s, color 0.15s, opacity 0.15s;
		border: 1px solid transparent;
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: var(--color-accent);
		color: oklch(0.18 0.008 70);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-accent-strong);
	}

	.btn-ghost {
		background-color: transparent;
		color: var(--color-ink-muted);
		border-color: var(--color-line);
	}

	.btn-ghost:hover {
		color: var(--color-ink);
		border-color: var(--color-ink-subtle);
	}

	.btn-ghost-danger {
		background-color: transparent;
		color: var(--color-ink-subtle);
		border-color: transparent;
	}

	.btn-ghost-danger:hover {
		color: var(--color-bad);
	}

	.saved-indicator {
		animation: saved-fade 1.8s ease-out forwards;
	}

	@keyframes saved-fade {
		0% {
			opacity: 0;
			transform: translateY(2px);
		}
		15% {
			opacity: 1;
			transform: translateY(0);
		}
		80% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
