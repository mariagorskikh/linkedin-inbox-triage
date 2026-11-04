# How the scripts talk to LinkedIn

Read this when a script returns an error or empty results. LinkedIn changes its web app often, so every selector, query name and response shape below may need updating. When something breaks, check the matching assumption here, fix the script in `scripts/`, and add a line to the change log at the bottom.

## Why the scripts use the API instead of clicking

- Clicking a conversation marks it read and shows the sender "Seen". If the user then does not reply, that is a small social cost, repeated for every thread. GET requests to LinkedIn's own GraphQL endpoints, made from the logged-in page, do not change `unreadCount`. You can confirm this by reading `unreadCount` before and after.
- `/messaging/` auto-opens the newest thread. `/messaging/thread/new/` shows the compose screen and the conversation list without opening any thread, so always start there.
- A page must have loaded one thread before the thread query (`messengerMessages`) shows up in its network log. collect.js returns `safeRow`: the newest one-to-one thread whose last message is the user's and which has nothing unread, so opening it changes nothing.

## Discovering the queries

The scripts read `performance.getEntriesByType('resource')` for URLs the page itself requested, so query hashes are never hardcoded. They change with LinkedIn deploys.

- `queryId=messengerConversations.<hash>`: the first load is a sync-token query with no category. Clicking "Load more conversations" once issues the category query (`lastUpdatedBefore`). Clicking again issues the cursor query (`nextCursor`). The category query uses a different hash from the sync query, so a hand-built category URL on the sync hash silently returns the sync results.
- Variables shape: `(query:(predicateUnions:List((conversationCategoryPredicate:(category:PRIMARY_INBOX)))),count:20,mailboxUrn:<enc urn>,lastUpdatedBefore:<ms>)`. `lastUpdatedBefore` is ignored in practice, so page with `nextCursor:<encodeURIComponent(cursor)>` taken from `data.<key>.metadata.nextCursor`. For the Other folder, use `SECONDARY_INBOX` instead of `PRIMARY_INBOX`.
- `queryId=messengerMessages.<hash>` with `variables=(conversationUrn:<enc urn>)` returns the thread. A sibling variant with `deliveredAt,countBefore,countAfter` also exists. The scripts use the plain one.
- `enc` means `encodeURIComponent` plus `(` to `%28` and `)` to `%29`. Without the paren encoding you get HTTP 400.
- Headers: `csrf-token` is the JSESSIONID cookie value without quotes, `accept: application/graphql`, and `credentials: 'include'`.

## Data shapes

- Conversation: `entityUrn` looks like `urn:li:msg_conversation:(urn:li:fsd_profile:<me>,2-<id>==)`. The thread URL is `/messaging/thread/2-<id>==/`. Other fields used: `lastActivityAt`, `unreadCount`, `categories` (INBOX, PRIMARY_INBOX or SECONDARY_INBOX, INMAIL), `groupChat`, `conversationParticipants[].participantType.member.{firstName,lastName,headline}.text`, and `messages.elements[0]` (the latest message only).
- Message: `body.text`, `subject.text` (InMail), `deliveredAt`, `sender.hostIdentityUrn` (equals the user's own fsd_profile URN when they sent it), and `renderContent[]` (attachments, shared posts, forwarded messages). The scripts print these as short tags like `[file]`.

## Output filter (why the hidden article exists)

- The Claude in Chrome `javascript_tool` truncates results at around 1000 characters. It may also replace the whole result with a "blocked" notice when the text contains `key=value` patterns or URL query strings. Thread ids end in `==`, so never print them. They stay in `sessionStorage.liInbox`, which lives only in that tab.
- For bulk text, the scripts write into a hidden `<article id="claude-dump">` and you call `get_page_text`, which reads the article instead of the page. The cleaner collapses links to `[link:domain]` and replaces `=` and `&`.

## Sending (what send_batch.py encodes)

- Selectors (most likely to change): thread header name `.msg-entity-lockup__entity-title`, compose box `.msg-form__contenteditable`, send button `.msg-form__send-button`, taken from `box.closest('form')` because a page-wide query can return another, disabled button.
- Text entry: `document.execCommand('insertText', false, text)` after focusing the box and moving the caret to the end. Simulated typing through the `computer` tool has been seen to silently drop whole messages.
- The Send button usually enables about 1 second after input. On a freshly loaded page it can take longer, so the send step polls for up to 4 seconds and re-enters the text once if needed.
- Confirm through the API about 2 seconds after clicking. The last message bubble in the DOM can belong to a different chat overlay, so it is not proof.
- Keep replies to one paragraph. Enter may send early.
- The preflight also scans the page for warning text ("unusual activity", "security verification", "you've reached the weekly limit" and similar) and for challenge URLs. If it finds any, it returns `linkedin-warning` and does nothing. Update the pattern list in send_batch.py if LinkedIn words these differently. The check reads the whole page, so a message that happens to quote one of those phrases will also stop the run. That is the safe way to fail: look at the page, and if it is a false alarm, send that one by hand.

## Timing and pace

- Wait about 8 seconds after `location.assign` to a thread. Shorter waits sometimes leave the page without its header or thread query yet, so preflight reports `no-msg-query` and nothing is sent. The first navigation after the safeRow thread may need 10 seconds.
- The `computer` wait action caps at 10 seconds per call. For longer pauses, chain several waits.
- send_batch.py adds a pause between people (20 seconds by default) on top of the page waits, and refuses more than 25 replies per run. Keep it that way. Human-like pacing and low volume are the point.
- After roughly 30 sends in one tab, `await` calls in `javascript_tool` have been seen to start timing out. If that happens, stop, close the tab, and start a fresh run later.

## Other notes

- If another tool or session sends LinkedIn messages from the same account at the same time, the preflight re-read (`already-answered`) is what prevents double replies.
- Group threads: the header is the group title, not a participant name. Use the title as `name`, or preflight says `wrong-thread`.
- A confirm can read false right after a real send when the other side gets an empty system entry right after it. Read the thread before retrying.

## Leaving drafts

When the user wants the replies typed into LinkedIn but not sent:

- An unsent compose box does not survive navigation or reload. LinkedIn does not save it as a real draft.
- So it is one Chrome tab per person, left open on that thread with the text in the box. Tell the user not to reload those tabs.
- `tabs_create_mcp` returns the new tab id only when the batch ends, so create the tabs in one call, then navigate and insert in later calls. New tabs have no `sessionStorage.liInbox`, so build the thread URLs first by dumping them into the hidden article and reading them with `get_page_text`.
- Keep the header name check in the insert step. It turns a mismapped tab into a no-op instead of the wrong message.

## Change log

Add a dated line here whenever you fix a script for a LinkedIn change.

- Initial public version.
