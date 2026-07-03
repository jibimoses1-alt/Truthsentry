# feat-0010: Tech Spec — Chat threads (sidebar and claim list)

## Context

See [`PRODUCT.md`](./PRODUCT.md). Thread UI is split: **presentational** sidebar in `packages/ui`, **data** in `chat-page-client.tsx`.

## Route map

| URL | File | Notes |
|-----|------|-------|
| `/{locale}/chat` | `apps/web/app/[locale]/chat/page.tsx` | RSC shell → `ChatPageClient` |
| `robots` | `index: false` on chat metadata | No indexing |

Auth redirects in `ChatPageClient`:

- `session.me` `UNAUTHORIZED` → `router.replace('/sign-in')`
- `!emailVerifiedAt` → `router.replace('/sign-up/verify')`

## UI modules

| Component | Path | Role |
|-----------|------|------|
| `ChatKitRoot` | `packages/ui/.../chat-kit-root.tsx` | `data-ui-kit="chatgpt"` |
| `ChatAppShell` | `packages/ui/.../chat-app-shell.tsx` | Sidebar + main layout |
| `ChatSidebar` | `packages/ui/.../chat-sidebar.tsx` | List, search, collapse |
| `ChatTopBar` | `packages/ui/.../chat-top-bar.tsx` | Title, wordmark |
| `ChatPageClient` | `apps/web/components/chat-page-client.tsx` | State, tRPC, wiring |

### ChatSidebar props (wired in client)

```ts
<ChatSidebar
  collapsed={collapsed}
  onToggleCollapse={() => setCollapsed((c) => !c)}
  threads={threads}
  onThreadSelect={(id) => { setActiveThreadId(id); setStarted(true); }}
  onNewChat={() => { setStarted(false); setComposer(''); setActiveThreadId(null); ... }}
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  navigationFooter={...}
  footer={<span>{t('privacyNote')}</span>}
/>
```

### Thread mapping

```ts
const threads: ChatThread[] = (threadsQuery.data ?? []).map((thread) => ({
  id: thread.id,
  title: thread.title ?? 'Conversation sans titre',
  updatedLabel: new Date(thread.updatedAt).toLocaleString(),
}));
```

## tRPC API

Router: `packages/trpc/src/routers/claim.ts`

### `claim.listMine` (query)

| Input | Output |
|-------|--------|
| `search?: string` (max 200) | Array of claim summaries |
| `factCheckStatus?: enum` | *(optional, unused in UI)* |
| `topicCategory?: enum` | *(optional, unused in UI)* |

**Where clause:**

- `createdByUserId = ctx.sessionUser.id`
- `search` → `OR` on `title` and `claimText` (`contains`, `insensitive`)
- `orderBy: { updatedAt: 'desc' }`, `take: 50`

**Output fields:** `id`, `title`, `status`, `factCheckStatus`, `topicCategory`, `claimLanguage`, `updatedAt`

### `claim.byId` (query)

Loads single claim + `messages` ascending; used when `activeThreadId` set.

### `claim.create` (mutation)

Creates thread on first message ([feat-0011](../feat-0011-chat-messaging/TECH.md)); invalidates `listMine` after success.

## Client queries

```ts
const threadsQuery = trpc.claim.listMine.useQuery(
  { search: searchQuery || undefined },
  { enabled: session.isSuccess },
);
const threadQuery = trpc.claim.byId.useQuery(
  { claimId: activeThreadId ?? '' },
  { enabled: Boolean(activeThreadId) },
);
```

Invalidation triggers:

- After `create`, `generateAssistantReply`, outbox flush, `claim.statusChanged` (realtime)

## State model (client)

| State | Purpose |
|-------|---------|
| `activeThreadId` | Selected claim id or `null` |
| `started` | `false` → home empty; `true` → message list |
| `searchQuery` | Passed to `listMine` |
| `collapsed` | Sidebar narrow mode |

**Gap:** No sync to URL search params.

## PRODUCT mapping

| UC IDs | Implementation |
|--------|----------------|
| UC-TH01–TH03 | `chat/page.tsx`, `ChatPageClient` session effects |
| UC-TH10–TH13 | `listMine`, `byId`, sidebar map |
| UC-TH20–TH21 | `searchQuery` → `listMine` input |
| UC-TH22 | API only — no UI |
| UC-TH30–TH33 | `onNewChat`, collapse handlers |
| UC-TH40–TH42 | `navigationFooter` in client |
| UC-TH50 | `byId` ownership check in router |

## Known gaps

| Gap | Detail | PRODUCT ref |
|-----|--------|-------------|
| No URL thread id | Refresh loses selection | Open questions |
| Search debounce | Re-query per keystroke | — |
| Filter UI missing | `factCheckStatus`, `topicCategory` on API | UC-TH22 |
| French hard-coded sidebar | “Nouveau chat”, “Rechercher des chats” | UC-TH52 |
| No delete thread | Clear is local only | UC-TH32 |
| `updatedLabel` locale | `toLocaleString()` without explicit locale | — |
| Pagination | Hard `take: 50` | Non-goals |

## Testing and validation

```bash
pnpm --filter @truthsentry/web exec tsc --noEmit
pnpm --filter @truthsentry/trpc test
```

| Case | Steps | Expected |
|------|-------|----------|
| List isolation | User A / User B | B cannot `byId` A’s claim |
| Search | Type substring of title | List filters |
| New chat | Click Nouveau chat | Empty state; no `byId` fetch |
| Create thread | Send first message | New row in sidebar |

## Related

- [feat-0011 TECH](../feat-0011-chat-messaging/TECH.md)
- [feat-0013 TECH](../feat-0013-chat-realtime/TECH.md)
- [feat-0005 TECH](../feat-0005-session/TECH.md)
- `packages/prisma/schema.prisma` — `Claim`, `ClaimMessage`
