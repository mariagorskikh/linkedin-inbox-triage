// linkedin-inbox-triage / threads.js  (read-only: API reads never mark a thread read)
// LinkedIn changes its web app often. If this returns errors or empty results, see references/mechanics.md.
// Fetches full threads for the given row numbers (the #N from dump.js) and writes them into the
// hidden <article> for get_page_text. Needs the page to have loaded one thread already
// (collect.js returns safeRow for that). Edit ROWS.
const ROWS = [0, 1];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const d = JSON.parse(sessionStorage.getItem('liInbox') || 'null');
const q = performance.getEntriesByType('resource').map((e) => e.name)
  .find((u) => u.includes('queryId=messengerMessages.') && !decodeURIComponent(u).includes('deliveredAt'));
let result;
if (!d) {
  result = 'NO_INBOX: run collect.js in this same tab first';
} else if (!q) {
  result = 'NO_MSG_QUERY: open the safeRow thread first (location.assign to /messaging/thread/<id>/), then rerun';
} else {
  const csrf = (document.cookie.match(/JSESSIONID="?([^";]+)"?/) || [])[1];
  const enc = (s) => encodeURIComponent(s).replace(/\(/g, '%28').replace(/\)/g, '%29');
  const clean = (s) => (s || '').replace(/https?:\/\/([^\s/]+)[^\s]*/g, '[link:$1]').replace(/[=&]/g, ' ').replace(/\s+/g, ' ').trim();
  const when = (ts) => new Date(ts).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' });
  const extras = (m) => {
    const out = [];
    for (const x of m.renderContent || []) {
      if (!x) continue;
      for (const k of Object.keys(x)) if (x[k] && typeof x[k] === 'object' && !k.startsWith('_')) out.push(k.replace(/Content$/, ''));
    }
    return out.length ? ' [' + out.join(',') + ']' : '';
  };
  const blocks = [];
  let failed = 0;
  for (const n of ROWS) {
    const r = d.rows.find((x) => x.i === n);
    if (!r) { blocks.push(`#${n} NOT FOUND`); failed++; continue; }
    const res = await fetch(q.split('variables=')[0] + 'variables=(conversationUrn:' + enc('urn:li:msg_conversation:(' + d.me + ',' + r.id + ')') + ')', { headers: { 'csrf-token': csrf, accept: 'application/graphql' }, credentials: 'include' });
    if (res.status !== 200) { blocks.push(`#${n} ${clean(r.names)}: HTTP ${res.status}`); failed++; continue; }
    const j = await res.json();
    const key = Object.keys(j.data || {}).find((k) => k.startsWith('messenger'));
    const els = (((j.data || {})[key] || {}).elements || []).slice().sort((a, b) => a.deliveredAt - b.deliveredAt);
    const lines = els.slice(-12).map((m) => {
      const mine = m.sender && m.sender.hostIdentityUrn === d.me;
      const who = mine ? 'ME' : ((m.sender && m.sender.participantType && m.sender.participantType.member && m.sender.participantType.member.firstName && m.sender.participantType.member.firstName.text) || 'THEM');
      const subj = m.subject && m.subject.text ? ` (subj: ${clean(m.subject.text)})` : '';
      return `   ${when(m.deliveredAt)} ${who}${subj}: ${clean((m.body && m.body.text) || m.renderContentFallbackText || '').slice(0, 900)}${extras(m)}`;
    });
    blocks.push(`#${n} ${clean(r.names)} :: ${clean(r.headline).slice(0, 100)} :: ${r.folder} :: ${els.length} msgs${els.length > 12 ? ' (last 12 shown)' : ''}\n` + lines.join('\n'));
    await sleep(500);
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
  pre.textContent = blocks.join('\n\n');
  art.appendChild(pre);
  result = `dumped ${ROWS.length - failed} threads (${failed} failed); now call get_page_text`;
}
result
