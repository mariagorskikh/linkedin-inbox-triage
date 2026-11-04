---
name: linkedin-inbox-triage
description: Review the user's whole LinkedIn inbox (Focused and Other) in their own logged-in Chrome, tell them which messages come from real, interesting people worth answering and which are sales pitches, job asks, bots or AI-written templates, then draft replies in the user's own short, warm voice and send only the ones they approve word for word. Use this whenever the user mentions LinkedIn messages, LinkedIn DMs, their LinkedIn inbox, "check my LinkedIn", "anyone worth answering on LinkedIn", "who should I respond to", "triage my LinkedIn", "reply to my LinkedIn messages", "go through my DMs", or asks you to answer people on LinkedIn, even if they don't name the skill. It reads threads without opening them (so senders see no "Seen" receipt) and sends nothing until the user approves the exact text in the conversation.
---

# LinkedIn inbox triage

Most LinkedIn inboxes are mostly pitches. The job: find the handful of real people worth answering, tell the user why each one matters, draft a reply in the user's own voice, and send only what the user approves.

It runs in the user's real Chrome through the Claude in Chrome extension (the `mcp__claude-in-chrome__*` tools), where they are already signed in to LinkedIn. Other built-in browsers are usually not signed in.

**This is an assistant for the user's own inbox, not an outreach tool.** Automating LinkedIn may violate the LinkedIn User Agreement, which restricts bots and automated access. The user is responsible for how they use this skill. Keep volume low, keep a human in the loop for every message, and stop the moment LinkedIn shows any warning.

## Rules

1. **Nothing sends without approval of the exact text, in this conversation.** Messages go out under the user's name and cannot be unsent. The user approves each message as written. A blanket "send them all" covers exactly the drafts you just showed, as shown, and never carries over to a later run or to new drafts. If the user asks for drafts only, stop at drafts.
2. **Read without opening.** Clicking a conversation marks it read and shows the sender "Seen". The scripts read everything through LinkedIn's own web API calls, which do not change read state. A thread only gets opened when you are about to send in it.
3. **The user's voice, not yours.** Draft from `voice.md` in this skill's folder (see Setup). Short, warm, one specific detail, at most one next step. No em dashes or en dashes anywhere, in replies or in the report.
4. **Read the whole thread before judging.** The preview is only the last message. A bare email address may be an answer to a question the user asked. A short code may be a door code for an event.
5. **Stop on friction.** A LinkedIn warning, CAPTCHA, "unusual activity" notice, rate limit message, login challenge, or a message request that needs Accept means stop the whole run and tell the user. Never click through any of them. Never solve a CAPTCHA.
6. **Stay out of live conversations.** If the user wrote in a thread in the last 24 hours, they are in the middle of it. Do not reply for them, even with a blanket approval. List it under "You're mid-conversation". The same goes for anything about their plans today or tonight, because only they know them.
7. **Show what is being approved.** Every person in the report comes with one sentence of context, their own message quoted, and the exact reply you would send. The user should never have to open LinkedIn to understand what a reply is answering.
8. **Reply only. No outreach.** Never send connection requests. Never message anyone who is not already in the user's inbox. Never send the same text to many people. Never message anyone outside the approved list, however good they look.
9. **Promise only what is true.** Use what is in the thread or what the user told you. Do not invent meetings, prices, dates, discounts or introductions.
10. **Check before offering a call link.** Before a draft offers the user's booking link, check that the person looks legitimate: a real role, a live company, a specific message. A stranger with a thin profile and a vague "would love to chat" gets a reply that answers their question instead. Say in the report who you downgraded and why.

## Setup

### Browser

Load the browser tools in one call:
`ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_close_mcp`

Call `tabs_context_mcp` with `createIfEmpty: true` and use that one tab for the whole run. Navigate it to `https://www.linkedin.com/messaging/thread/new/`. This page shows the conversation list without opening any thread. Plain `/messaging/` auto-opens the newest thread and marks it read.

If the page shows a login screen, stop and ask the user to sign in themselves. Never type credentials.

### Voice (first run)

Look for `voice.md` in this skill's folder.

- **If it exists,** read it before drafting anything.
- **If it does not exist,** build it with the user:
  1. Ask the user to paste 5 to 10 of their own real LinkedIn replies, or offer to read their recent sent replies from the inbox. To read them, run the collect step, then `threads.js` on 10 to 20 threads where the last message is the user's. That reads only; nothing is opened or marked.
  2. Follow `references/voice-guide.md` to pull out their rules: length, greeting, punctuation, emoji, sign-off, words they never use.
  3. Ask who is high priority for them. Offer examples: customers, investors, candidates they want to hire, peers and founders, press, students, community members. Ask what they are selling or not selling, and which links they share (booking link, email, website).
  4. Copy `voice.example.md` to `voice.md`, fill it in, and show it to the user to confirm. `voice.md` is personal and is git-ignored.

### Window

Read `last_run.json` in this skill's folder if it exists. Use DAYS = days since that run + 2, at least 3 and at most 30. Use 30 if there is no file or the user says "everything".

### Running scripts

Scripts live in `scripts/` in this skill's folder. To run a `.js` script, Read the file and pass its full text as the `text` argument of `javascript_tool`, changing only the constants at the top. Each one returns a short status or an error string that says what to do.

## Step 1: Collect

1. Run `collect.js` with DAYS set. It clicks "Load more conversations" itself (the page only reveals the paging queries after that), reads Focused and Other back to the cutoff, and stores every conversation in the tab's sessionStorage. It returns counts plus `safeRow`.
2. Open the safeRow thread. It is a one-to-one thread whose last message is the user's and which has nothing unread, so opening it changes nothing. Opening it makes the page load LinkedIn's thread query, which the other scripts reuse:
   `const r = JSON.parse(sessionStorage.getItem('liInbox')).rows.find((x) => x.i === SAFE); location.assign('/messaging/thread/' + r.id + '/'); 'ok'`
   Then wait 8 seconds. If safeRow is null, tell the user that opening one thread will mark it read, and ask first.

The tab has to stay open until the end. Row numbers and thread ids live only in its sessionStorage. If the tab dies, rerun collect.js. Row numbers will change.

## Step 2: Read and sort

1. Run `dump.js` in chunks of 50 (edit START and END) and call `get_page_text` after each chunk. Results come back through a hidden `<article>`, because `javascript_tool` output is short and blocks anything that looks like a URL query string.
2. Do a first sort from the previews using `references/classification.md`.
3. Run `threads.js` (up to 10 rows at a time) for everything headed into the report, for anything cryptic or very short, and for threads where the user wrote earlier. Check timestamps: if the user's own last message is less than 24 hours old, it goes in "mid-conversation". Call `get_page_text` after each run.
4. If the user has a calendar or meeting-notes tool connected, check read-only whether they already met or have booked time with anyone you plan to offer a call to. Already met means the reply refers to the meeting. Already booked means no link.
5. If a message reports a security issue or bug in the user's product with specifics, flag it at the top. If the user's code is available locally, offer to check whether it is real.

## Step 3: Report, with a draft for every person

For each person in an answer bucket, give exactly three things, in this order:

1. **Context, one sentence:** who they are from their profile and where the thread left off.
2. **Their message:** their own words, quoted. Trim a long one to the part that needs an answer. Never paraphrase it.
3. **The reply:** the full text, exactly as it will go out.

Everything else stays a one-liner: no reply needed, skipped, and the counts.

```
I read N conversations from the last D days (Focused + Other). M end with a message you haven't answered. About K are real people worth a reply.

**Deal with this first**
<name> (<folder>, unread since <date>): <what happened>

**You're mid-conversation (yours to answer)**
- **Name**: <their last message>, <when you last wrote>

**Reply to these**

**1. Name** (company or context), <date>, unread
Context: <one sentence>
They wrote: "<their message>"
Reply: "<the full draft, word for word>"

**2. Name** ... same three lines

**Quick one-liners, borderline:** same three lines each
**Your call (for example investors or recruiters):** Name, what they want, draft only if the user wants one
**No reply needed:** one line each
**Skipped:** the kinds of messages, with a count

Approve these as written, or tell me which to change or cut.
```

Mention anything the run itself changed, such as a thread that had to be opened.

## Step 4: Send, after approval

1. Apply the user's edits first. When they rewrite a reply, use their words exactly and drop what they cut. Show the changed text again if the change was more than a word or two.
2. Write only the approved replies to a JSON file in the session scratchpad: `[{"row": 12, "name": "Sam Rivera", "text": "...", "approved": true}]`. `row` is the #N from dump.js. `name` is exactly as dump.js printed it. It must match the thread header, which is how the send step checks it is in the right conversation. Set `approved: true` only for replies the user approved in chat, as written.
3. Dry run first: `python3 scripts/send_batch.py --tab <tabId> --file <json>`. With no `--live` flag it prints what it would send and checks every reply (approval flag, one paragraph, no dashes, no banned words). Fix anything it flags.
4. Send in small batches: `python3 scripts/send_batch.py --tab <tabId> --file <json> --start 0 --count 3 --live`. Pass the printed JSON array as the `actions` argument of `browser_batch`, then continue with `--start 3`, and so on. The script refuses more than 25 approved replies per run and adds a pause between people.
5. Read each person's three results:
   - Clean send: preflight `state: "inserted"`, send `clicked: true`, confirm `sent: true`.
   - `linkedin-warning`: stop the whole run now. Tell the user what the page says.
   - `already-answered`: someone already replied (the user on their phone, another tool). Skip and tell the user.
   - `compose-not-empty`: the user has an unsent draft there. Leave it and tell them.
   - `wrong-thread`, `no-compose-box`, `thread-read-failed`, `no-msg-query`, `insert-failed`: nothing was sent. Retry that one person once on their own. If it fails again, report it.
   - Never retry anyone whose confirm said `sent: true`. If confirm says false right after a click, read the thread with threads.js before retrying.

## Step 5: Verify, summarize, close

1. Run `verify.js` with every row you sent to. Set SINCE_MIN to cover the send window. Then call `get_page_text`. It flags any thread without exactly one new message from the user, and lists anyone who already answered.
2. Final message:
   - how many were sent, and that each was checked
   - a table: To | What went out (full text)
   - who you did not message and why
   - replies that already came in
   - what is still on the user (invites owed, bug follow-ups)
3. Write `last_run.json` in this folder: `{"date": "YYYY-MM-DD", "window_days": D, "replied": [names], "left_by_choice": [names]}`. It is git-ignored.
4. Close the tab with `tabs_close_mcp`. That also clears the sessionStorage.

## Leaving drafts instead of sending

If the user wants the replies typed into LinkedIn but not sent, see "Leaving drafts" in `references/mechanics.md`. Short version: an unsent compose box does not survive navigation, so it is one tab per person.

## When something breaks

LinkedIn changes its web app often. The selectors and query names in the scripts may stop working. `references/mechanics.md` explains how each script talks to LinkedIn: how queries are found, URL encoding, response shapes, DOM selectors and timing. Read it before changing a script.
