<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { SendHorizontal, RefreshCw, ShieldOff } from 'lucide-svelte';
	import { CoachState } from '../../lib/coachState.svelte';
	import { ChatClient } from '../../lib/chat/client.svelte';
	import { chatWsUrl } from '../../lib/chat/protocol';
	import { getOrCreateThreadId } from '../../lib/chat/thread';
	import { formatTime } from '../../lib/format';

	const agentsUrl = import.meta.env.VITE_AGENTS as string;
	const coachToken = (import.meta.env.VITE_COACH_TOKEN as string | undefined) ?? '';

	const coach = new CoachState();
	// Set when the blocked-page redirect brought the user here: which wall they hit.
	const blockedHost = new URLSearchParams(location.search).get('blocked') ?? '';
	let client = $state<ChatClient | null>(null);
	let draft = $state('');
	let scroller = $state<HTMLElement | null>(null);

	onMount(async () => {
		const threadId = await getOrCreateThreadId();
		client = new ChatClient(chatWsUrl(agentsUrl, threadId, coachToken));
		client.connect();
	});

	onDestroy(() => client?.disconnect());

	// Keep the newest message in view as history loads and chunks stream in.
	$effect(() => {
		client?.messages;
		client?.streamText;
		const el = scroller;
		if (el) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight }));
	});

	function submit(event: Event): void {
		event.preventDefault();
		if (!client) return;
		client.send(draft);
		draft = '';
	}

	// The escape hatch: 15 fixed minutes, priced at a written reason. Rides
	// the background's coach socket, so it works even if the agent chat is
	// down — the coach is bypassed, not consulted.
	function override(): void {
		const reason = draft.trim();
		if (!reason || !client) return;
		browser.runtime.sendMessage({ type: 'override', message: reason });
		client.messages = [
			...client.messages,
			{ role: 'notice', content: `Override taken — 15 minutes. Reason: ${reason}` }
		];
		draft = '';
	}

	function lockLine(): string {
		if (coach.agentReleaseTimeLeft === null) return 'Agent lock engaged';
		return `Released — ${formatTime(coach.agentReleaseTimeLeft)} left`;
	}
</script>

<main class="flex flex-col h-full max-w-2xl mx-auto">
	<header
		class="flex items-center justify-between px-4 py-3 border-b"
		style:border-color="var(--color-line)"
	>
		<div class="flex items-center gap-2">
			<span
				class="inline-block w-2 h-2 rounded-full"
				style:background-color={coach.agentReleaseTimeLeft === null
					? 'var(--color-bad)'
					: 'var(--color-good)'}
			></span>
			<h1 class="text-sm font-semibold">Coach</h1>
		</div>
		<span class="text-xs" style:color="var(--color-ink-muted)">{lockLine()}</span>
	</header>

	{#if blockedHost}
		<div
			class="px-4 py-2 text-xs text-center border-b"
			style:border-color="var(--color-line)"
			style:background-color="var(--color-surface-2)"
			style:color="var(--color-ink-muted)"
		>
			Blocked: <span style:color="var(--color-bad)">{blockedHost}</span> — state your case, or
			type a reason and take the override.
		</div>
	{/if}

	<section bind:this={scroller} class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
		{#if client}
			{#if client.messages.length === 0 && !client.streamText && client.status === 'open'}
				<p class="text-sm text-center my-auto" style:color="var(--color-ink-subtle)">
					State your case. The coach decides.
				</p>
			{/if}

			{#each client.messages as message}
				{#if message.role === 'error'}
					<p class="text-xs text-center" style:color="var(--color-bad)">{message.content}</p>
				{:else if message.role === 'notice'}
					<p class="text-xs text-center" style:color="var(--color-ink-muted)">{message.content}</p>
				{:else}
					<div
						class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap {message.role ===
						'human'
							? 'self-end'
							: 'self-start'}"
						style:background-color={message.role === 'human'
							? 'var(--color-accent-soft)'
							: 'var(--color-surface-2)'}
					>
						{message.content}
					</div>
				{/if}
			{/each}

			{#if client.streamText}
				<div
					class="max-w-[85%] self-start rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
					style:background-color="var(--color-surface-2)"
				>
					{client.streamText}
				</div>
			{:else if client.awaitingReply}
				<div
					class="self-start rounded-2xl px-4 py-2.5 text-sm animate-pulse"
					style:background-color="var(--color-surface-2)"
					style:color="var(--color-ink-muted)"
				>
					…
				</div>
			{/if}

			{#if client.status === 'connecting'}
				<p class="text-xs text-center" style:color="var(--color-ink-subtle)">Connecting…</p>
			{:else if client.status === 'closed'}
				<button
					type="button"
					class="self-center inline-flex items-center gap-2 text-xs rounded-lg px-3 py-1.5"
					style:background-color="var(--color-surface-2)"
					style:color="var(--color-ink-muted)"
					onclick={() => client?.connect()}
				>
					<RefreshCw size={12} />
					Disconnected — reconnect
				</button>
			{/if}
		{/if}
	</section>

	<form
		class="flex items-center gap-2 px-4 py-3 border-t"
		style:border-color="var(--color-line)"
		onsubmit={submit}
	>
		<input
			type="text"
			class="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
			style:background-color="var(--color-surface-2)"
			placeholder="Ask for a release…"
			bind:value={draft}
			disabled={!client || client.status !== 'open'}
		/>
		<button
			type="submit"
			class="p-2.5 rounded-xl transition-colors disabled:opacity-40"
			style:background-color="var(--color-accent-soft)"
			style:color="var(--color-accent-strong)"
			disabled={!client || client.status !== 'open' || client.awaitingReply || !draft.trim()}
			aria-label="Send"
		>
			<SendHorizontal size={16} />
		</button>
		<button
			type="button"
			class="p-2.5 rounded-xl transition-colors disabled:opacity-40"
			style:background-color="var(--color-surface-2)"
			style:color="var(--color-bad)"
			disabled={!draft.trim()}
			onclick={override}
			title="Override: take 15 minutes. Your typed message becomes the recorded reason."
			aria-label="Override — 15 minutes"
		>
			<ShieldOff size={16} />
		</button>
	</form>
</main>
