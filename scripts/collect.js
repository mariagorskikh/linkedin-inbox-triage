// linkedin-inbox-triage / collect.js  (read-only; opens no thread, sends nothing)
// LinkedIn changes its web app often. If this returns errors or empty results, see references/mechanics.md.
// Run with claude-in-chrome javascript_tool on any linkedin.com/messaging/ page.
// Edit DAYS, then pass this whole file as the `text` argument.
const DAYS = 30; // how far back to read

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const csrf = (document.cookie.match(/JSESSIONID="?([^";]+)"?/) || [])[1];
const H = { 'csrf-token': csrf, accept: 'application/graphql' };
const convUrls = () => performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.includes('queryId=messengerConversations'));
const catUrl = () => convUrls().filter((u) => decodeURIComponent(u).includes('lastUpdatedBefore')).pop();
const curUrl = () => convUrls().filter((u) => decodeURIComponent(u).includes('nextCursor')).pop();
const clickMore = async () => {
  const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Load more conversations');
  if (!b) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  await sleep(2500);
  return true;
};

let result;
// The page only issues the category query after one "Load more" and the cursor query after a second.
for (let t = 0; t < 5 && !(catUrl() && curUrl()); t++) { if (!(await clickMore())) await sleep(1500); }
if (!csrf) {
  result = 'NOT_SIGNED_IN: no LinkedIn session cookie in this Chrome';
} else if (!(catUrl() && curUrl())) {
  result = 'NEED_LOAD_MORE: click "Load more conversations" twice by hand (computer tool), then rerun';
} else {
  const lubT = catUrl();
  const curT = curUrl();
  const me = (decodeURIComponent(lubT).match(/urn:li:fsd_profile:[A-Za-z0-9_-]+/) || [])[0];
  const withCursor = (tmpl, cursor) => {
    const i = tmpl.indexOf('nextCursor');
    let j = i + 'nextCursor'.length;
    if (tmpl.slice(j, j + 3) === '%3A') j += 3; else if (tmpl[j] === ':') j += 1;
    let k = j;
    while (k < tmpl.length && tmpl[k] !== ')' && tmpl.slice(k, k + 3) !== '%29') k++;
    return tmpl.slice(0, j) + encodeURIComponent(cursor) + tmpl.slice(k);
  };
  const getPage = async (url) => {
    const r = await fetch(url, { headers: H, credentials: 'include' });
    if (r.status !== 200) return { ok: false, status: r.status, els: [] };
    const j = await r.json();
    const key = Object.keys(j.data || {}).find((k) => k.startsWith('messenger'));
    const d = (j.data || {})[key] || {};
    return { ok: true, els: d.elements || [], next: d.metadata && d.metadata.nextCursor };
  };
  const cutoff = Date.now() - DAYS * 864e5;
  const all = new Map();
  const log = [];
  for (const cat of ['PRIMARY_INBOX', 'SECONDARY_INBOX']) {
    const setCat = (u) => u.replace(/PRIMARY_INBOX|SECONDARY_INBOX/, cat);
    let p = await getPage(setCat(lubT));
    let pages = 0;
    while (p.ok && p.els.length && pages < 40) {
      p.els.forEach((c) => all.set(c.entityUrn, c));
      pages++;
      if (Math.min(...p.els.map((c) => c.lastActivityAt)) < cutoff || !p.next) break;
      await sleep(700);
      p = await getPage(setCat(withCursor(curT, p.next)));
    }
    log.push((cat === 'PRIMARY_INBOX' ? 'Focused' : 'Other') + ' pages ' + pages + (p.ok ? '' : ' status ' + p.status));
  }
  const member = (p) => p && p.participantType && p.participantType.member;
  const txt = (o) => (o && o.text) || '';
  const conv = [...all.values()].filter((c) => c.lastActivityAt >= cutoff).sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  const rows = conv.map((c, i) => {
    const others = (c.conversationParticipants || []).filter((p) => p.hostIdentityUrn !== me);
    const names = others.map((p) => {
      const m = member(p);
      if (m) return (txt(m.firstName) + ' ' + txt(m.lastName)).trim();
      const o = p.participantType && (p.participantType.organization || p.participantType.custom);
      return (o && txt(o.name)) || '?';
    });
    const m0 = others.length === 1 ? member(others[0]) : null;
    const lm = c.messages && c.messages.elements && c.messages.elements[0];
    const cats = c.categories || [];
    return {
      i,
      id: c.entityUrn.split(',').pop().replace(/\)$/, ''),
      ts: c.lastActivityAt,
      names: names.join(', '),
      headline: m0 ? txt(m0.headline) : '',
      unread: c.unreadCount || 0,
      fromMe: !!(lm && lm.sender && lm.sender.hostIdentityUrn === me),
      folder: cats.includes('SECONDARY_INBOX') ? 'Other' : 'Focused',
      inmail: cats.includes('INMAIL'),
      group: !!c.groupChat,
      subject: lm ? txt(lm.subject) : '',
      text: lm ? (txt(lm.body) || lm.renderContentFallbackText || '') : '',
    };
  });
  sessionStorage.setItem('liInbox', JSON.stringify({ me, at: Date.now(), days: DAYS, rows }));
  const safe = rows.find((r) => r.fromMe && !r.unread && !r.group);
  result = JSON.stringify({
    total: rows.length,
    waiting: rows.filter((r) => !r.fromMe).length,
    unread: rows.filter((r) => r.unread).length,
    other: rows.filter((r) => r.folder === 'Other').length,
    safeRow: safe ? safe.i : null,
    log,
  });
}
result
