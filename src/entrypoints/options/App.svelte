<script lang="ts">
	import './app.css';
	import { onMount, onDestroy } from 'svelte';
	import { Check, Copy } from 'lucide-svelte';
	import ConnectionStatus from '../../components/ConnectionStatus.svelte';
	import FocusStatus from '../../components/FocusStatus.svelte';
	import UpdateButton from '../../components/UpdateButton.svelte';
	import { CoachState } from '../../lib/coachState.svelte';
	import { getStorage, setStorage, onStorageChanged } from '../../lib/storage';

	const state = new CoachState();
	const isFirefox = import.meta.env.BROWSER === 'firefox';

	let redirectUrl = '';
	let redirectError = '';
	let redirectSaved = false;
	let redirectSavedTimer: ReturnType<typeof setTimeout> | null = null;
	let whitelist: string[] = [];
	let copied = false;
	let copiedTimer: ReturnType<typeof setTimeout> | null = null;

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

	onMount(async () => {
		const data = await getStorage('redirect_url', 'whitelist');
		redirectUrl = data.redirect_url;
		whitelist = data.whitelist;
	});
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
				focus={state.focus}
				agentReleaseTimeLeft={state.agentReleaseTimeLeft}
			/>
			<ConnectionStatus connected={state.connected} reconnectAt={state.reconnectAt} />
			<UpdateButton updateFocus={() => state.refresh()} />
		</div>
	</header>

	<section class="py-8 border-t" style:border-color="var(--color-line)">
		<div class="flex items-baseline justify-between mb-2">
			<h2 class="text-xl font-medium tracking-tight" style:color="var(--color-ink)">
				Redirect when blocked
			</h2>
		</div>
		<p class="text-sm mb-5 max-w-[60ch]" style:color="var(--color-ink-muted)">
			Where to send the user when they hit a site that isn't whitelisted. Leave empty to show an
			alert instead.
		</p>
		<form on:submit|preventDefault={saveRedirectUrl} class="space-y-3">
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
				<button class="btn btn-ghost" type="button" on:click={clearRedirectUrl}>Clear</button>
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
			{#if whitelist.length > 0}
				<button
					class="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
					style:color={copied ? 'var(--color-good)' : 'var(--color-ink-muted)'}
					on:click={copyWhitelist}
					on:mouseenter={(e) => {
						if (!copied)
							(e.currentTarget as HTMLElement).style.color = 'var(--color-ink)';
					}}
					on:mouseleave={(e) => {
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
						Edit this, then <code>npm run install:browsers</code>; restart Firefox to apply.
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

		{#if whitelist.length > 0}
			<ul class="mt-6 divide-y divide-line">
				{#each whitelist as site}
					<li class="flex items-center justify-between py-2.5">
						<span class="text-[15px] tabular-nums truncate" style:color="var(--color-ink)">
							{site}
						</span>
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
