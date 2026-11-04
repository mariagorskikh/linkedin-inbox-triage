---
name: linkedin-inbox-triage
description: Review the user's whole LinkedIn inbox (Focused and Other) in their own logged-in Chrome, sort real, interesting people from sales pitches, job asks, bots and AI-written templates, draft replies in the user's own short, warm voice, self-review each one against voice.md and the thread, then send the safe replies itself and report every message sent in full. Use this whenever the user mentions LinkedIn messages, LinkedIn DMs, their LinkedIn inbox, "check my LinkedIn", "anyone worth answering on LinkedIn", "who should I respond to", "triage my LinkedIn", "reply to my LinkedIn messages", "go through my DMs", or asks you to answer people on LinkedIn, even if they don't name the skill. It reads threads without opening them (so senders see no "Seen" receipt). It asks its setup questions once, then runs end to end; judgment calls (live conversations, investors, recruiters, anything about money) are left for the user, and `mode: review` restores an approval step before every send.
---

# LinkedIn inbox triage

Most LinkedIn inboxes are mostly pitches. The job: find the handful of real people worth answering, draft a reply in the user's own voice, check each draft hard, send the safe ones, and report everything that went out plus what is left for the user.

It runs in the user's real Chrome through the Claude in Chrome extension (the `mcp__claude-in-chrome__*` tools), where they are already signed in to LinkedIn. Other built-in browsers are usually not signed in.

**This is an assistant for the user's own inbox, not an outreach tool.** Automating LinkedIn may violate the LinkedIn User Agreement, which restricts bots and automated access. The user is responsible for how they use this skill. Running in autonomous mode, where replies go out without a per-message okay, makes that risk the user's own choice; `mode: review` keeps a human approval on every message. Either way: keep volume low and stop the moment LinkedIn shows any warning.

## How this skill runs

- **Ask once, up front.** On the first run, or when `voice.md` or `config.yaml` is missing or a needed value is blank, ask the setup questions (see Setup) in one short batch, write the files, then continue without further questions. Later runs ask nothing. If a required fact is genuinely missing and cannot be found, ask one short question and keep working on everything else.
- **Then do everything.** In `autonomous` mode (the default in `config.yaml`) the skill collects, sorts, drafts, runs the self-review gate, sends the replies that pass, verifies them, and reports. There is no approval step for ordinary replies.
- **Money is the only approval.** Anything that spends money or names money waits for the user's explicit yes in chat: prices, discounts, paid offers, invoices, paid plans, anything with a currency amount. This skill itself never spends money.
- **Judgment buckets are never sent autonomously.** They are listed in the report with a draft for the user: "You're mid-conversation" threads, the "Your call" bucket (investors, recruiters, and anything `voice.md` marks as decide-myself), anything involving money, and replies to security reports beyond a short thank-you.
- **Hard stops are not approvals, they are stops.** See Rule 5. On a stop, halt that action, finish whatever else is safe (the report, verification of sends already made), and report.
- **`review` mode** keeps the old per-message approval gates. See "Review mode" at the end.

## Rules

1. **Send only what passed the self-review gate (Step 4).** Messages go out under the user's name and cannot be unsent. A reply that fails any check is fixed or held, never sent as is.
2. **Read without opening.** Clicking a conversation marks it read and shows the sender "Seen". The scripts read everything through LinkedIn's own web API calls, which do not change read state. A thread only gets opened when you are about to send in it.
3. **The user's voice, not yours.** Draft from `voice.md` in this skill's folder. Short, warm, one specific detail, at most one next step. No em dashes or en dashes anywhere, in replies or in the report.
4. **Read the whole thread before judging.** The preview is only the last message. A bare email address may be an answer to a question the user asked. A short code may be a building entry code for an event.
5. **Stop on friction.** A LinkedIn warning, CAPTCHA, "unusual activity" notice, rate limit or limit message, login or 2FA challenge, or a message request that needs Accept means stop all sending and tell the user. Never click through any of them. Never solve a CAPTCHA. Never type credentials.
6. **Stay out of live conversations.** If the user wrote in a thread in the last 24 hours, they are in the middle of it. Do not reply for them. List it under "You're mid-conversation". The same goes for anything about their plans today or tonight, because only they know them.
7. **Reply only. No outreach.** Never send connection requests. Never message anyone who is not already in the user's inbox. Never send the same text to many people.
8. **Promise only what is true.** Use what is in the thread or in `voice.md`. Never invent meetings, prices, dates, discounts or introductions.
9. **Check before offering a call link.** Before a draft offers the user's booking link, check that the person looks legitimate: a real role, a live company, a specific message. A stranger with a thin profile and a vague "would love to chat" gets a reply that answers their question instead. Say in the report who you downgraded and why.
10. **Keep the caps.** At most 25 replies per run, batches of 3 (never more than 5), a pause of at least 10 seconds (20 by default) after each person.

## Setup

### Browser

Load the browser tools in one call:
`ToolSearch select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__browser_batch,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_close_mcp`

Call `tabs_context_mcp` with `createIfEmpty: true` and use that one tab for the whole run. Navigate it to `https://www.linkedin.com/messaging/thread/new/`. This page shows the conversation list without opening any thread. Plain `/messaging/` auto-opens the newest thread and marks it read.

If the page shows a login screen, stop and ask the user to sign in themselves.

### First run: the setup questions (one batch)

Read `config.yaml` and `voice.md` in this skill's folder. If both exist and are filled in, skip this section and ask nothing.

Otherwise ask, in one message:

1. "Paste 5 to 10 LinkedIn replies you have sent, or should I read your recent sent replies?" (Reading uses collect.js, then `threads.js` on 10 to 20 threads where the last message is the user's. That only reads.)
2. "Who is high priority for you?" Offer examples: customers, investors, candidates, peers and founders, press, students, community.
3. "What should I never send without you?" Offer the defaults: investors, recruiters, anything about money. Add whatever they name.
4. "What are you offering, what are you not, and which links do you share (booking link, email, website)?"
5. "Autonomous (I send replies that pass my self-review, then report) or review (you okay each reply first)?" Default: autonomous.

Then follow `references/voice-guide.md` to pull their rules out of the samples, copy `voice.example.md` to `voice.md` and fill it in, copy `config.example.yaml` to `config.yaml` with their mode, show a short summary of both, and continue the run. Both files are git-ignored.

### Window

Read `last_run.json` in this skill's folder if it exists. Use DAYS = days since that run + 2, at least 3 and at most 30. Use 30 if there is no file or the user says "everything".

### Running scripts

Scripts live in `scripts/` in this skill's folder. To run a `.js` script, Read the file and pass its full text as the `text` argument of `javascript_tool`, changing only the constants at the top. Each one returns a short status or an error string that says what to do.

## Step 1: Collect

1. Run `collect.js` with DAYS set. It clicks "Load more conversations" itself (the page only reveals the paging queries after that), reads Focused and Other back to the cutoff, and stores every conversation in the tab's sessionStorage. It returns counts plus `safeRow`.
2. Open the safeRow thread. It is a one-to-one thread whose last message is the user's and which has nothing unread, so opening it changes nothing. Opening it makes the page load LinkedIn's thread query, which the other scripts reuse:
   `const r = JSON.parse(sessionStorage.getItem('liInbox')).rows.find((x) => x.i === SAFE); location.assign('/messaging/thread/' + r.id + '/'); 'ok'`
   Then wait 8 seconds. If safeRow is null, open one thread you will certainly reply to (an unread message from a clearly real person; it gets opened at send time anyway) and note that in the report.

The tab has to stay open until the end. Row numbers and thread ids live only in its sessionStorage. If the tab dies, rerun collect.js. Row numbers will change.

## Step 2: Read and sort

1. Run `dump.js` in chunks of 50 (edit START and END) and call `get_page_text` after each chunk. Results come back through a hidden `<article>`, because `javascript_tool` output is short and blocks anything that looks like a URL query string.
2. Do a first sort from the previews using `references/classification.md`.
3. Run `threads.js` (up to 10 rows at a time) for everything headed into an answer bucket, for anything cryptic or very short, and for threads where the user wrote earlier. Check timestamps: if the user's own last message is less than 24 hours old, it goes in "mid-conversation". Call `get_page_text` after each run.
4. If the user has a calendar or meeting-notes tool connected, check read-only whether they already met or have booked time with anyone you plan to offer a call to. Already met means the reply refers to the meeting. Already booked means no link.
5. If a message reports a security issue or bug in the user's product with specifics, flag it at the top. If the user's code is available locally, check whether it is real. The reply is a short thank-you at most.

## Step 3: Draft

Draft a reply for every person in "Reply to these", "Quick one-liners" and the clear "Borderline" cases, following `references/voice-guide.md`. Draft (but mark held) the judgment buckets: mid-conversation, Your call, anything touching money, security follow-ups beyond a thank-you. A borderline case you cannot decide from `voice.md` is held too.

## Step 4: Self-review gate (mandatory before any send)

For every draft not held, check all of these. Fix and re-check; if it still fails, hold it.

1. **Bucket:** not a judgment bucket, not on the user's "never send without me" list in `voice.md`, and no money in it (no price, discount, paid offer, invoice, currency amount).
2. **Thread:** re-read the thread as the recipient would. The reply answers what they actually asked, uses their name as shown, and does not repeat something the user already said.
3. **Voice:** matches `voice.md` on length, greeting, punctuation, emoji and sign-off, and uses none of their "never say" phrases. One paragraph, no line breaks, no dashes.
4. **Facts and links:** every claim is in the thread or `voice.md`. Every link is one the user listed, written out in full. A booking link only for people who passed Rule 9.
5. **Uniqueness:** no two replies share the same text.
6. **Script check:** the dry run of `send_batch.py` (Step 5) passes with no complaints.

Write down, per reply, one line on why it passed. That goes in the report.

## Step 5: Send

1. Write the replies that passed to a JSON file in the session scratchpad: `[{"row": 12, "name": "Sam Rivera", "text": "...", "approved": true}]`. `row` is the #N from dump.js. `name` is exactly as dump.js printed it; it must match the thread header. In autonomous mode you set `approved: true` yourself for each reply that passed the self-review gate. A reply that mentions money also needs `"money_approved": true`, which only the user's yes in chat can give.
2. Dry run: `python3 scripts/send_batch.py --tab <tabId> --file <json> --banned "<never-say phrases from voice.md>"`. Fix anything it flags.
3. Send in small batches: same command plus `--start 0 --count 3 --live`. Pass the printed JSON array as the `actions` argument of `browser_batch`, then continue with `--start 3`, and so on. The script refuses more than 25 replies per run and adds a pause between people.
4. Read each person's three results:
   - Clean send: preflight `state: "inserted"`, send `clicked: true`, confirm `sent: true`.
   - `linkedin-warning`: hard stop. Send nothing more this run. Tell the user what the page says.
   - `already-answered`: someone already replied (the user on their phone, another tool). Skip and report.
   - `compose-not-empty`: the user has an unsent draft there. Leave it and report.
   - `wrong-thread`, `no-compose-box`, `thread-read-failed`, `no-msg-query`, `insert-failed`: nothing was sent. Retry that one person once on their own. If it fails again, report it.
   - Never retry anyone whose confirm said `sent: true`. If confirm says false right after a click, read the thread with threads.js before retrying.

## Step 6: Verify and report

1. Run `verify.js` with every row you sent to. Set SINCE_MIN to cover the send window. Then call `get_page_text`. It flags any thread without exactly one new message from the user, and lists anyone who already answered.
2. Send the report:

```
I read N conversations from the last D days (Focused + Other). M ended with a message you hadn't answered. I sent S replies, each checked afterwards.

**Deal with this first**
<name> (<folder>, unread since <date>): <what happened, what I sent if anything>

**Sent** (full text)
| To | Their message | What went out | Why it passed |

**Yours to decide** (not sent)
- You're mid-conversation: **Name**, their last message, when you last wrote
- Your call: **Name**, what they want, draft: "<text>"
- Involves money: **Name**, what they asked, draft: "<text>" (say yes and I send it)
- Held by the self-review: **Name**, why, draft: "<text>"

**No reply needed:** one line each
**Skipped:** the kinds of messages, with a count
**Stopped on:** any warning or failure, and what was not sent because of it
**Already replied back:** anyone who answered during the run
```

Mention anything the run itself changed, such as a thread that had to be opened. If the user says to send a held draft, treat that as their approval of that exact text and send it through Step 5.

3. Write `last_run.json` in this folder: `{"date": "YYYY-MM-DD", "window_days": D, "replied": [names], "held": [names]}`. It is git-ignored.
4. Offer to add any reply the user edited to "Approved replies" in `voice.md`.
5. Close the tab with `tabs_close_mcp`. That also clears the sessionStorage.

## Review mode

With `autonomy.mode: review` in `config.yaml`, the old gates apply between Step 4 and Step 5:

1. Show every reply in the report before sending, each with three things: one sentence of context, their message quoted (trimmed to the part that needs an answer, never paraphrased), and the full reply exactly as it will go out. End with "Approve these as written, or tell me which to change or cut."
2. Nothing sends without approval of the exact text, in this conversation. A blanket "send them all" covers exactly the drafts just shown, as shown, and never carries over to a later run or to new drafts. If the user asks for drafts only, stop at drafts.
3. Apply the user's edits first. When they rewrite a reply, use their words exactly and drop what they cut. Show the changed text again if the change was more than a word or two.
4. Set `"approved": true` only for replies the user approved in chat, as written. Then run Step 5 and Step 6 as above.

## Leaving drafts instead of sending

If the user wants the replies typed into LinkedIn but not sent, see "Leaving drafts" in `references/mechanics.md`. Short version: an unsent compose box does not survive navigation, so it is one tab per person.

## When something breaks

LinkedIn changes its web app often. The selectors and query names in the scripts may stop working. `references/mechanics.md` explains how each script talks to LinkedIn: how queries are found, URL encoding, response shapes, DOM selectors and timing. Read it before changing a script.
