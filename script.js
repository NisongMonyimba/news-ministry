(() => {
  const menu = document.getElementById('mobileMenu'), button = document.getElementById('menuButton');
  function setMenu(open) { if (!menu || !button) return; menu.hidden = !open; button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); }
  button?.addEventListener('click', () => setMenu(button.getAttribute('aria-expanded') !== 'true'));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && button?.getAttribute('aria-expanded') === 'true') { setMenu(false); button.focus(); } });
  document.addEventListener('click', e => { if (button?.getAttribute('aria-expanded') === 'true' && !button.contains(e.target) && !menu.contains(e.target)) setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) setMenu(false); });
  const toggle = document.getElementById('lyricsToggle'), lyrics = document.getElementById('fullLyrics');
  toggle?.addEventListener('click', () => { const expanded = toggle.getAttribute('aria-expanded') !== 'true'; lyrics.hidden = !expanded; toggle.setAttribute('aria-expanded',String(expanded)); toggle.textContent = expanded ? 'Hide full song lyrics ↑' : 'Read full song lyrics ↓'; });
  const toast = document.getElementById('toast'); let timer;
  function announce(msg) { if (!toast) return; clearTimeout(timer);toast.textContent=msg;toast.classList.add('show');timer=setTimeout(()=>toast.classList.remove('show'),3500); }
  document.querySelectorAll('[data-share], #shareButton').forEach(btn => btn.addEventListener('click', async () => {
    const url = location.href.split('#')[0] + (btn.id === 'shareButton' ? '#message' : '');
    try { if (navigator.share && /^https?:/.test(location.protocol)) { await navigator.share({title:document.title,url});return; } if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(url);announce('Link copied');return;} const el=document.createElement('textarea');el.value=url;document.body.appendChild(el);el.select();const ok=document.execCommand('copy');el.remove();announce(ok?'Link copied':'Copy the address from your browser.'); } catch(e){if(e.name!=='AbortError') announce('Copy the address from your browser.');}
  }));
  const year = document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
  document.querySelectorAll('audio').forEach(audio => audio.addEventListener('play', () => document.querySelectorAll('audio').forEach(other => {if(other!==audio)other.pause();})));
})();
