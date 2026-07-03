# feat-0010: Chat threads (sidebar and claim list)

## Summary

Authenticated users manage **claim threads** (conversations) from `/{locale}/chat`. The **left sidebar** (`ChatSidebar`) lists threads from **`claim.listMine`**, supports **search/filter**, **new chat** (clears selection), **thread select**, and **collapse**. Thread titles come from claim `title` or truncated first message. Depends on [feat-0004](../feat-0004-auth/PRODUCT.md) (session), [feat-0005](../feat-0005-session/PRODUCT.md) (cookie), and [feat-0009](../feat-0009-theme-branding/PRODUCT.md) (chat kit).

Messaging, uploads, and realtime are [feat-0011](../feat-0011-chat-messaging/PRODUCT.md), [feat-0012](../feat-0012-chat-uploads/PRODUCT.md), [feat-0013](../feat-0013-chat-realtime/PRODUCT.md).

## Problem

Users submit multiple claims over time. Without a persistent thread list, returning users cannot find prior dossiers. The sidebar must reflect server state, support quick search, and separate “new conversation” from selecting an existing claim.

## Non-goals

- Deleting claims from sidebar (“clear conversations” only clears **local selection** today).
- Pagination UI (API returns max 50; no “load more” in sidebar).
- Admin queue or cross-user threads ([feat-0018](../feat-0018-admin/PRODUCT.md)).
- URL deep-linking to `?claimId=` (active thread is client state only).
- Folder organization or pinning threads.

## Actors

| Actor | Description |
|-------|-------------|
| **Signed-in claimant** | Lists and opens own threads only. |
| **Platform** | Persists claims; enforces `createdByUserId` scope. |

## Use case catalog

### A. Entry and auth

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-TH01** | Open chat | Verified session | Navigate to `/{locale}/chat` | Sidebar + main pane render |
| **UC-TH02** | Unauthenticated | No session cookie | Open `/chat` | Redirect to `/{locale}/sign-in` |
| **UC-TH03** | Unverified email | Session without `emailVerifiedAt` | Open `/chat` | Redirect to `/{locale}/sign-up/verify` |

### B. Thread list

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-TH10** | Load my threads | Verified user | Page mount → `claim.listMine` | Up to 50 claims, `updatedAt` desc |
| **UC-TH11** | Empty history | No prior claims | First visit | Sidebar list empty; home empty state in main pane |
| **UC-TH12** | Display thread row | List returned | Each row shows title + `updatedLabel` | Title from `title` or “Conversation sans titre” |
| **UC-TH13** | Select thread | Row click | `onThreadSelect(id)` | `claim.byId` loads messages; `started=true` |

### C. Search and filter

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-TH20** | Search by text | Threads exist | Type in search input | `listMine({ search })` — matches `title` or `claimText` (case-insensitive) |
| **UC-TH21** | Clear search | Search active | Clear input | Full list returns |
| **UC-TH22** | Filter by verdict (API) | — | — | **Gap:** `factCheckStatus` / `topicCategory` input exists on API; UI does not expose filters |

### D. New chat and navigation

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-TH30** | New chat | Any | Click “Nouveau chat” | `activeThreadId=null`, `started=false`, composer cleared |
| **UC-TH31** | First message creates thread | New chat + send | User sends ([feat-0011](../feat-0011-chat-messaging/PRODUCT.md)) | `claim.create` → thread appears in list after invalidate |
| **UC-TH32** | Clear selection | Thread open | Sidebar “clear conversations” | Local reset only; server threads unchanged |
| **UC-TH33** | Collapse sidebar | Expanded sidebar | Toggle collapse | Icon-only rail with new-chat + expand |

### E. Sidebar chrome

| ID | Use case | Preconditions | Main flow | Postcondition |
|----|----------|---------------|-----------|---------------|
| **UC-TH40** | Theme / locale | Footer utilities | `LocaleSwitcher`, `ThemeToggle` | Preferences apply |
| **UC-TH41** | Sign out | Footer | Logout mutation | Session cleared → sign-in |
| **UC-TH42** | Privacy note | Footer | Static text | `chat.privacyNote` i18n string |

### F. Negative cases

| ID | Expected behavior |
|----|-------------------|
| **UC-TH50** | `claim.byId` for another user’s id → `NOT_FOUND` |
| **UC-TH51** | Search string > 200 chars → API validation error (trim/max) |
| **UC-TH52** | Sidebar strings partly hard-coded French in `ChatSidebar` (i18n gap) |

## Behavior (product rules)

1. **Ownership:** `listMine` and `byId` filter `createdByUserId = session user`.

2. **Verified email required:** `requireVerifiedEmail` on claim procedures.

3. **List cap:** 50 threads per query; ordered by `updatedAt` descending.

4. **Search debouncing:** Client passes `search` on every keystroke today (no debounce — performance gap for fast typists).

5. **New chat** does not call API; first send uses `claim.create`.

6. **Clear conversations** is UX-only; does not delete server data.

7. **Active thread** stored in React state (`activeThreadId`), not URL.

## Open questions

1. Persist `activeThreadId` in URL or sessionStorage? **Default:** URL query in follow-on feat.

2. Expose verdict/topic filters in sidebar? **Default:** yes when list grows.

3. i18n for `ChatSidebar` chrome? **Default:** move strings to `messages/*.json`.

## Related

- [feat-0011 PRODUCT](../feat-0011-chat-messaging/PRODUCT.md) — create thread on first send
- [feat-0013 PRODUCT](../feat-0013-chat-realtime/PRODUCT.md) — list invalidates on status change
- [feat-0004 PRODUCT](../feat-0004-auth/PRODUCT.md)
- [`../../chat.md`](../../chat.md)
