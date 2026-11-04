// linkedin-inbox-triage / dump.js  (read-only)
// LinkedIn changes its web app often. If this returns errors or empty results, see references/mechanics.md.
// Writes a slice of the collected inbox into a hidden <article> so get_page_text can read it.
// javascript_tool output is capped near 1000 characters and blocks anything that looks like
// a query string, so bulk text always goes through the article. Edit START/END/WAITING_ONLY.
const START = 0;
const END = 50;
const WAITING_ONLY = true; // true: only threads whose last message is NOT yours

const d = JSON.parse(sessionStorage.getItem('liInbox') || 'null');
let result;
if (!d) {
  result = 'NO_INBOX: run collect.js in this same tab first';
} else {
  const clean = (s) => (s || '').replace(/https?:\/\/([^\s/]+)[^\s]*/g, '[link:$1]').replace(/[=&]/g, ' ').replace(/\s+/g, ' ').trim();
  const day = (ts) => new Date(ts).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const list = d.rows.filter((r) => !WAITING_ONLY || !r.fromMe);
  const lines = list.slice(START, END).map((r) =>
    `#${r.i} | ${day(r.ts)} | ${clean(r.names)} | ${clean(r.headline).slice(0, 90)} | ${r.unread ? 'UNREAD' : 'read'} | ${r.folder}${r.inmail ? '/InMail' : ''}${r.group ? ' | GROUP' : ''}${r.fromMe ? ' | LAST FROM ME' : ''}${r.subject ? ' | subj: ' + clean(r.subject) : ''}\n   > ${clean(r.text).slice(0, 420)}`);
  let art = document.getElementById('claude-dump');
  if (!art) {
    art = document.createElement('article');
    art.id = 'claude-dump';
    art.style.cssText = 'position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden;';
    document.body.appendChild(art);
  }
  art.textContent = '';
  const pre = document.createElement('pre');
  pre.textContent = lines.join('\n\n') || '(nothing in this range)';
  art.appendChild(pre);
  result = `dumped ${lines.length} of ${list.length} (${START}-${Math.min(END, list.length)}); now call get_page_text`;
}
result
