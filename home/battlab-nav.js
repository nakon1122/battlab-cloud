/* BATTLAB app bar — the same top bar on every BATTLAB web app.
 * Shows: BATTLAB Home · Battery Cloud · VOLTOL Monitor, the signed-in email and a sign-out button.
 * Load after session-client.js:  <script src="https://www.battlab.net/battlab-nav.js" defer></script>
 */
(() => {
  'use strict';
  if (document.getElementById('bl-appbar')) return;
  const host = location.hostname;
  const here = host.startsWith('batterycloud.') ? 'battery' : host.startsWith('voltol.') ? 'voltol' : 'home';
  const apps = [
    { id: 'home', href: 'https://www.battlab.net/', icon: '⌂', label: 'หน้าหลัก' },
    { id: 'battery', href: 'https://batterycloud.battlab.net/', icon: '🔋', label: 'Battery Cloud' },
    { id: 'voltol', href: 'https://voltol.battlab.net/', icon: '⚡', label: 'VOLTOL' }
  ];
  const css = `
#bl-appbar{all:initial;display:block;position:relative;padding-top:env(safe-area-inset-top);z-index:2147483000;background:#070c11;border-bottom:1px solid #26323c;font:600 14px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8eef3}
#bl-appbar *{box-sizing:border-box;font:inherit;color:inherit}
#bl-appbar .bl-in{display:flex;align-items:center;gap:6px;max-width:1280px;margin:0 auto;padding:6px max(10px,env(safe-area-inset-left))}
#bl-appbar .bl-brand{display:flex;align-items:center;gap:6px;text-decoration:none;font-weight:900;font-style:italic;letter-spacing:.08em;padding:6px 8px 6px 2px;white-space:nowrap}
#bl-appbar .bl-brand b{color:#ffcf22;font-style:normal}
#bl-appbar nav{display:flex;gap:4px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
#bl-appbar nav::-webkit-scrollbar{display:none}
#bl-appbar nav a{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:8px 12px;border-radius:999px;text-decoration:none;white-space:nowrap;color:#b9c6d0;border:1px solid transparent}
#bl-appbar nav a:hover{background:#15212b;color:#fff}
#bl-appbar nav a[aria-current=page]{background:#ffcf22;color:#151000;border-color:#ffcf22}
#bl-appbar nav a[aria-current=page] span{color:#151000}
#bl-appbar .bl-user{display:flex;align-items:center;gap:6px;white-space:nowrap}
#bl-appbar .bl-mail{max-width:190px;overflow:hidden;text-overflow:ellipsis;color:#8fa1ae;font-weight:500}
#bl-appbar button{cursor:pointer;min-height:36px;padding:7px 12px;border-radius:9px;background:#131d26;border:1px solid #485864}
#bl-appbar button:hover{filter:brightness(1.2)}
#bl-appbar a:focus-visible,#bl-appbar button:focus-visible{outline:3px solid #ffcf22;outline-offset:2px}
@media(max-width:640px){#bl-appbar .bl-brand span,#bl-appbar .bl-mail{display:none}#bl-appbar nav a{padding:8px 10px}#bl-appbar nav a .bl-l{font-size:13px}}
@media(max-width:380px){#bl-appbar nav a .bl-l{display:none}#bl-appbar nav a{min-width:42px;justify-content:center}}
@media print{#bl-appbar{display:none}}`;
  function build() {
    if (document.getElementById('bl-appbar')) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const bar = document.createElement('div');
    bar.id = 'bl-appbar';
    bar.innerHTML =
      '<div class="bl-in">' +
        '<a class="bl-brand" href="https://www.battlab.net/" aria-label="BATTLAB หน้าหลัก"><b aria-hidden="true">⚡</b><span>BATTLAB</span></a>' +
        '<nav aria-label="แอป BATTLAB">' +
          apps.map(a => '<a href="' + a.href + '"' + (a.id === here ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + a.icon + '</span><span class="bl-l">' + a.label + '</span></a>').join('') +
        '</nav>' +
        '<div class="bl-user" hidden><span class="bl-mail"></span><button type="button" class="bl-out">ออกจากระบบ</button></div>' +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);
    const user = bar.querySelector('.bl-user');
    const mail = bar.querySelector('.bl-mail');
    function paint() {
      const email = window.battlabSession?.email() || '';
      user.hidden = !email;
      mail.textContent = email;
      mail.title = email;
    }
    bar.querySelector('.bl-out').addEventListener('click', () => {
      window.battlabSession?.clear();
      location.reload();
    });
    paint();
    setInterval(paint, 5000);
    window.addEventListener('focus', paint);
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
