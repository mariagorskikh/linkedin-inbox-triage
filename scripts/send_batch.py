#!/usr/bin/env python3
"""Build Claude in Chrome browser_batch actions that send approved LinkedIn replies safely.

DRY RUN BY DEFAULT. Without --live this only checks the file and prints what it would send.
In autonomous mode the agent passes --live itself, after the self-review gate in SKILL.md.

Input: a JSON file with a list of replies, each:
  {"row": <#N from dump.js>, "name": "<exact name in the thread header>",
   "text": "<single-paragraph reply>", "approved": true}

"approved": true means the exact text was approved: by the self-review gate in autonomous
mode, or by the user in review mode. Replies without it are refused.

A reply that mentions money (a currency amount, price, discount, invoice, paid offer) also
needs "money_approved": true, which is set only after the user said yes to that exact text
in chat, in any mode. Replies that mention money without it are refused.

Usage:
  python3 send_batch.py --tab 123456 --file replies.json                 # dry run
  python3 send_batch.py --tab 123456 --file replies.json --start 0 --count 3 --live

With --live it prints a JSON array. Pass it verbatim as the `actions` argument of
browser_batch, then read each person's three results: preflight `state` must be "inserted",
send `clicked` must be true, confirm `sent` must be true. If any preflight says
"linkedin-warning", stop the whole run.

Per person the batch: opens the thread, checks the page for LinkedIn warning or limit
screens, re-reads the thread through the API and refuses if the last message is already
yours, checks the header is the right person and the box is empty, inserts the text with
execCommand, clicks the Send button of that box's own form only if the box holds exactly
the reply, confirms through the API that the thread now ends with the reply, then pauses
before the next person.

LinkedIn changes its web app often. If selectors stop matching, see references/mechanics.md.
"""
import argparse
import json
import re
import sys

MAX_PER_RUN = 25

# Anything that looks like money. Matching is deliberately broad: a false hit only means the
# reply waits for the user's yes.
MONEY = re.compile(
    r"[$\u20ac\u00a3\u00a5]\s?\d|\b\d[\d,.]*\s?(k|m)?\s?(usd|eur|gbp|dollars?|euros?|pounds?)\b"
    r"|\b(price|prices|pricing|discount|discounts|invoice|invoices|coupon|promo code|refund|paid plan|per month|/mo)\b",
    re.IGNORECASE,
)

FETCH_LAST = r"""
const d = JSON.parse(sessionStorage.getItem('liInbox') || 'null');
const r = d && d.rows.find((x) => x.i === ROW);
const q = performance.getEntriesByType('resource').map((e) => e.name)
  .find((u) => u.includes('queryId=messengerMessages.') && !decodeURIComponent(u).includes('deliveredAt'));
let last = null;
if (r && q) {
  const csrf = (document.cookie.match(/JSESSIONID="?([^";]+)"?/) || [])[1];
  const enc = (s) => encodeURIComponent(s).replace(/\(/g, '%28').replace(/\)/g, '%29');
  const res = await fetch(q.split('variables=')[0] + 'variables=(conversationUrn:' + enc('urn:li:msg_conversation:(' + d.me + ',' + r.id + ')') + ')', { headers: { 'csrf-token': csrf, accept: 'application/graphql' }, credentials: 'include' });
  if (res.status === 200) {
    const j = await res.json();
    const key = Object.keys(j.data || {}).find((k) => k.startsWith('messenger'));
    const els = (((j.data || {})[key] || {}).elements || []).slice().sort((a, b) => a.deliveredAt - b.deliveredAt);
    const m = els[els.length - 1];
    if (m) last = { mine: !!(m.sender && m.sender.hostIdentityUrn === d.me), text: (m.body && m.body.text) || '' };
  }
}
"""

NAV = r"""
const d = JSON.parse(sessionStorage.getItem('liInbox') || 'null');
const r = d && d.rows.find((x) => x.i === ROW);
let result;
if (!r) { result = 'NO_ROW ' + ROW + ' (run collect.js in this tab first)'; } else { location.assign('/messaging/thread/' + r.id + '/'); result = 'opening row ' + ROW; }
result
"""

# Words and URL parts that mean LinkedIn wants a human to look. Update if LinkedIn rewords them.
WARNING_CHECK = r"""
const pageText = (document.body ? document.body.innerText : '').toLowerCase();
const warnWords = ['unusual activity', 'security verification', 'verify you are human', "let's do a quick security check",
  'reached the weekly limit', 'reached your limit', 'too many requests', 'temporarily restricted', 'account restricted'];
const warnHit = warnWords.find((w) => pageText.includes(w)) || (/checkpoint|challenge|authwall|login/.test(location.pathname) ? 'challenge page' : null);
"""

PREFLIGHT = r"""
const hdr = ((document.querySelector('.msg-entity-lockup__entity-title') || {}).innerText || '').trim();
const box = document.querySelector('.msg-form__contenteditable');
let state;
if (warnHit) state = 'linkedin-warning';
else if (!r) state = 'no-row';
else if (!q) state = 'no-msg-query';
else if (!last) state = 'thread-read-failed';
else if (last.mine) state = 'already-answered';
else if (!hdr.includes(NAME)) state = 'wrong-thread';
else if (!box) state = 'no-compose-box';
else if (box.innerText.trim().length) state = 'compose-not-empty';
else {
  box.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(box);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  state = document.execCommand('insertText', false, TEXT) ? 'inserted' : 'insert-failed';
}
JSON.stringify({ row: ROW, state, warning: warnHit || null, header: hdr.slice(0, 40) })
"""

SEND = r"""
const n = (s) => s.replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
let hdr, box, form, btn, typed;
const read = () => {
  hdr = ((document.querySelector('.msg-entity-lockup__entity-title') || {}).innerText || '').trim();
  box = document.querySelector('.msg-form__contenteditable');
  form = box && box.closest('form');
  btn = form && form.querySelector('.msg-form__send-button');
  typed = box ? n(box.innerText) : '';
};
read();
// Right after a page load the editor can take a few seconds to register the text and enable Send.
for (let t = 0; t < 8 && btn && btn.disabled && typed === n(TEXT); t++) { await sleep(500); read(); }
let reentered = false;
if (!warnHit && btn && btn.disabled && box && typed === n(TEXT)) {
  // Still disabled: the editor was not listening yet when the text went in. Re-enter it once.
  box.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, TEXT);
  reentered = true;
  read();
  for (let t = 0; t < 8 && btn && btn.disabled; t++) { await sleep(500); read(); }
}
const ok = !warnHit && hdr.includes(NAME) && typed === n(TEXT) && !!btn && !btn.disabled;
if (ok) btn.click();
else if (box && typed.includes(n(TEXT).slice(0, 25))) { box.innerHTML = '<p><br></p>'; box.dispatchEvent(new Event('input', { bubbles: true })); }
JSON.stringify({ row: ROW, clicked: ok, warning: warnHit || null, exactText: typed === n(TEXT), typedLen: typed.length, buttonDisabled: btn ? btn.disabled : null, reentered })
"""

CONFIRM = r"""
const n = (s) => (s || '').replace(/\s+/g, ' ').trim();
const sent = !!(last && last.mine && n(last.text).startsWith(n(TEXT).slice(0, 40)));
JSON.stringify({ row: ROW, sent, warning: warnHit || null, last: last ? (last.mine ? 'ME: ' : 'THEM: ') + n(last.text).slice(0, 40).replace(/[=&?]/g, ' ') : null })
"""


def js(body: str, row: int, name: str, text: str, with_fetch: bool) -> str:
    head = f"const ROW = {row}; const NAME = {json.dumps(name)}; const TEXT = {json.dumps(text)};\n"
    return (head + WARNING_CHECK + (FETCH_LAST if with_fetch else "") + body).strip()


def actions_for(tab: int, row: int, name: str, text: str, pause: int) -> list:
    def run(code):
        return {"name": "javascript_tool", "input": {"action": "javascript_exec", "tabId": tab, "text": code}}

    def wait(sec):
        return {"name": "computer", "input": {"action": "wait", "duration": sec, "tabId": tab}}

    acts = [
        run((f"const ROW = {row};\n" + NAV).strip()),
        wait(8),
        run(js(PREFLIGHT, row, name, text, with_fetch=True)),
        wait(1),
        run(js(SEND, row, name, text, with_fetch=False)),
        wait(2),
        run(js(CONFIRM, row, name, text, with_fetch=True)),
    ]
    # Human-like pause before the next person. The wait action caps at 10 s, so chain them.
    left = pause
    while left > 0:
        acts.append(wait(min(10, left)))
        left -= 10
    return acts


def check(reply: dict, banned: list) -> list:
    problems = []
    text = reply.get("text", "")
    if reply.get("approved") is not True:
        problems.append('not approved ("approved": true is set only for this exact text, by the self-review gate '
                        'in autonomous mode or by the user in chat in review mode)')
    if MONEY.search(text) and reply.get("money_approved") is not True:
        problems.append('mentions money ("money_approved": true is set only after the user says yes to this exact '
                        'text in chat, in any mode)')
    if not isinstance(reply.get("row"), int):
        problems.append("row must be an integer (#N from dump.js)")
    if not reply.get("name"):
        problems.append("name is required (as shown in the thread header)")
    if not text.strip():
        problems.append("text is empty")
    if "\n" in text:
        problems.append("text has a line break (Enter can send early); make it one paragraph")
    if "\u2014" in text or "\u2013" in text:
        problems.append("text contains an em or en dash")
    low = text.lower()
    for word in banned:
        if word and word.lower() in low:
            problems.append(f'text contains banned phrase "{word}"')
    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tab", type=int, required=True, help="Claude in Chrome tabId where collect.js ran")
    ap.add_argument("--file", required=True, help="JSON list of {row, name, text, approved[, money_approved]}")
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--count", type=int, default=3, help="people per browser_batch (3 is comfortable)")
    ap.add_argument("--pause", type=int, default=20, help="seconds to wait after each person (minimum 10)")
    ap.add_argument("--banned", default="", help="comma-separated phrases to refuse, e.g. from voice.md")
    ap.add_argument("--live", action="store_true", help="emit real send actions; without it, dry run only. In autonomous mode the agent passes it after the self-review gate")
    args = ap.parse_args()

    with open(args.file) as f:
        replies = json.load(f)
    if not isinstance(replies, list):
        print("file must hold a JSON list", file=sys.stderr)
        return 1
    if len(replies) > MAX_PER_RUN:
        print(f"{len(replies)} replies is more than the {MAX_PER_RUN} per run limit; split across days", file=sys.stderr)
        return 1
    if args.count > 5:
        print("--count above 5 is not allowed; keep batches small", file=sys.stderr)
        return 1
    banned = [w.strip() for w in args.banned.split(",") if w.strip()]
    bad = {i: check(r, banned) for i, r in enumerate(replies)}
    bad = {i: p for i, p in bad.items() if p}
    if bad:
        for i, p in bad.items():
            print(f"reply {i} ({replies[i].get('name')}): " + "; ".join(p), file=sys.stderr)
        return 1
    rows = [r["row"] for r in replies]
    if len(rows) != len(set(rows)):
        print("duplicate rows in the file; each person gets one reply", file=sys.stderr)
        return 1
    texts = [" ".join(r["text"].split()).lower() for r in replies]
    if len(texts) != len(set(texts)):
        print("the same text appears more than once; every reply should be written for its person", file=sys.stderr)
        return 1

    chunk = replies[args.start: args.start + args.count]
    remaining = len(replies) - (args.start + len(chunk))
    nxt = f" (next: --start {args.start + len(chunk)})" if remaining > 0 else ""

    if not args.live:
        print("DRY RUN. Nothing will be sent. All replies passed the checks.")
        for r in chunk:
            print(f'  row {r["row"]} -> {r["name"]}: "{r["text"]}"')
        print(f"# {len(chunk)} people in this batch; {max(remaining, 0)} left after it{nxt}. Add --live to build send actions.",
              file=sys.stderr)
        return 0

    pause = max(10, args.pause)
    out = []
    for r in chunk:
        out.extend(actions_for(args.tab, r["row"], r["name"], r["text"], pause))
    print(json.dumps(out))
    print(f"# LIVE: {len(chunk)} people in this batch; {max(remaining, 0)} left after it{nxt}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
