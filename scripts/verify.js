// linkedin-inbox-triage / verify.js  (read-only)
// LinkedIn changes its web app often. If this returns errors or empty results, see references/mechanics.md.
// After sending: checks each replied thread has exactly one new message from you in the last
// SINCE_MIN minutes, and lists anyone who has already answered. Details go to the hidden
// <article> (read with get_page_text); the return value is a short summary. Edit ROWS.
const ROWS = [0, 1];
const SINCE_MIN = 180;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const d = JSON.parse(sessionStorage.getItem('liInbox') || 'null');
const q = performance.getEntriesByType('resource').map((e) => e.name)
  .find((u) => u.includes('queryId=messengerMessages.') && !decodeURIComponent(u).includes('deliveredAt'));
let result;
if (!d || !q) {
  result = !d ? 'NO_INBOX: run collect.js in this tab first' : 'NO_MSG_QUERY: open any thread in this tab first';
} else {
  const csrf = (document.cookie.match(/JSESSIONID="?([^";]+)"?/) || [])[1];
  const enc = (s) => encodeURIComponent(s).replace(/\(/g, '%28').replace(/\)/g, '%29');
  const clean = (s) => (s || '').replace(/https?:\/\/([^\s/]+)[^\s]*/g, '[link:$1]').replace(/[=&]/g, ' ').replace(/\s+/g, ' ').trim();
  const since = Date.now() - SINCE_MIN * 60000;
  const problems = [];
  const replies = [];
  let good = 0;
  for (const n of ROWS) {
    const r = d.rows.find((x) => x.i === n);
    if (!r) { problems.push(`#${n}: row not found`); continue; }
    const res = await fetch(q.split('variables=')[0] + 'variables=(conversationUrn:' + enc('urn:li:msg_conversation:(' + d.me + ',' + r.id + ')') + ')', { headers: { 'csrf-token': csrf, accept: 'application/graphql' }, credentials: 'include' });
    const j = await res.json();
    const key = Object.keys(j.data || {}).find((k) => k.startsWith('messenger'));
    const els = (((j.data || {})[key] || {}).elements || []).slice().sort((a, b) => a.deliveredAt - b.deliveredAt);
    const mine = els.filter((m) => m.sender && m.sender.hostIdentityUrn === d.me && m.deliveredAt >= since);
    const firstMine = mine[0];
    const theirsAfter = firstMine ? els.filter((m) => m.deliveredAt > firstMine.deliveredAt && !(m.sender && m.sender.hostIdentityUrn === d.me)) : [];
    if (mine.length === 1) good++;
    else problems.push(`#${n} ${clean(r.names)}: ${mine.length} new messages from you` + mine.map((m) => ' | ' + clean(m.body && m.body.text).slice(0, 60)).join(''));
    if (theirsAfter.length) replies.push(`#${n} ${clean(r.names)} replied: ${clean(theirsAfter[theirsAfter.length - 1].body && theirsAfter[theirsAfter.length - 1].body.text).slice(0, 140)}`);
    await sleep(350);
  }
  let art = document.getElementById('claude-dump');
  if (!art) {
    art = document.createElement('article');
    art.id = 'claude-dump';
    art.style.cssText = 'position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden;';
    document.body.appendChild(art);
  }
  art.textContent = '';
  const pre = document.createElement('pre');
  pre.textContent = ['PROBLEMS', ...(problems.length ? problems : ['none']), '', 'REPLIES ALREADY', ...(replies.length ? replies : ['none'])].join('\n');
  art.appendChild(pre);
  result = JSON.stringify({ checked: ROWS.length, good, problems: problems.length, replies: replies.length, note: 'details via get_page_text' });
}
result
