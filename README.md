# linkedin-inbox-triage

A Claude Code skill that goes through your LinkedIn inbox with you. It reads every conversation in Focused and Other, tells you which messages come from real people worth answering and which are sales pitches, job asks, bots or AI-written templates, then drafts replies in your own voice. It sends only the replies you approve, word for word.

It reads threads without opening them, so senders do not see a "Seen" receipt for messages you decide to skip.

## What you get

- A short report: who to answer first, who you are mid-conversation with, quick one-liners, and what was skipped and why.
- For every person worth answering: one line of context, their message quoted, and the exact reply it would send.
- Replies in your voice, built from your own past messages.
- Sending only after you approve each reply, with a check afterwards that each one actually went out.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- The [Claude in Chrome](https://claude.com/chrome) extension, connected to Claude Code
- Google Chrome, signed in to LinkedIn
- Python 3 (for the send helper)

## Install

```bash
git clone https://github.com/mariagorskikh/linkedin-inbox-triage ~/.claude/skills/linkedin-inbox-triage
```

Restart Claude Code so it picks up the skill.

## Set up your voice

Copy the example and fill it in:

```bash
cd ~/.claude/skills/linkedin-inbox-triage
cp voice.example.md voice.md
```

Paste 5 to 10 real replies you have sent on LinkedIn, and add your rules: how long your replies are, emoji or not, how you greet people, what you are offering, which links you share, and who is high priority for you (customers, investors, hires, peers).

If you skip this, the skill will offer to build `voice.md` on the first run by reading your recent sent replies, and it will ask who matters most to you. `voice.md` is git-ignored and stays on your machine.

## Example prompts

- "Check my LinkedIn"
- "Anyone worth answering on LinkedIn this week?"
- "Go through my LinkedIn DMs and draft replies, don't send anything"
- "Triage my LinkedIn inbox, including the Other folder"
- "Send the ones you drafted except the recruiter"

## How it works

1. **Collect.** In your Chrome, it opens LinkedIn's messaging page on a screen that does not open any thread, then reads your conversation list through the same web API calls the page itself uses. Reading this way does not mark anything as read.
2. **Read and sort.** It reads full threads for anything promising or unclear, and sorts each conversation into buckets: deal with first, mid-conversation, reply, quick one-liner, your call, borderline, no reply needed, skip. See `references/classification.md` for the signals it uses to spot pitches and AI templates.
3. **Report.** You get context, their message and a draft reply for every person worth answering.
4. **Send, after approval.** You approve, edit or cut each draft. Approved replies go out one at a time with pauses in between. Before each send it re-checks the thread, so it will not reply if you already answered from your phone, and it stops if LinkedIn shows any warning.
5. **Verify.** It re-reads each thread to confirm exactly one new message went out, and lists anyone who already replied.

## Safety and caveats

- **Read the LinkedIn User Agreement.** It restricts bots and automated access to LinkedIn. Using this skill may violate it, and your account could be limited or restricted. You are responsible for how you use it. It is built as an assistant for your own inbox, with a human approving every message, not as an automation or outreach tool.
- **Drafts until you approve.** Nothing is sent unless you approve the exact text in chat. The send helper is a dry run by default and refuses any reply not marked as approved.
- **Replies only.** It never sends connection requests, never messages people who are not already in your inbox, and refuses to send the same text twice in a run.
- **Low volume, slow pace.** At most 25 replies per run, small batches, and a pause between each person.
- **Stops on friction.** Any warning, CAPTCHA, limit notice or login challenge stops the run. It never clicks through them.
- **It will break sometimes.** LinkedIn changes its web app often. The selectors and API details in `scripts/` may stop working. `references/mechanics.md` explains how each piece works so you or Claude can fix it.
- **Your data stays local.** Conversations are read in your browser tab and held in that tab's session storage until the tab closes.

## Files

```
SKILL.md                     instructions Claude follows
voice.example.md             template for your voice (copy to voice.md)
references/classification.md how messages are sorted
references/voice-guide.md    how your voice is built and used
references/mechanics.md      how the scripts talk to LinkedIn, and how to fix them
scripts/collect.js           read the conversation list
scripts/dump.js              print a slice of it for Claude to read
scripts/threads.js           read full threads
scripts/send_batch.py        build the send steps for approved replies (dry run by default)
scripts/verify.js            check that each reply went out once
```

## License

MIT. See `LICENSE`.
