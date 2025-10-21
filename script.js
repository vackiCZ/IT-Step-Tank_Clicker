// ...existing code...
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.cards');
  if (!container) return;

  // Background chill music: loop and attempt autoplay (graceful-fail for browsers)
  const bgAudio = document.getElementById('bg-audio');
  if (bgAudio) {
    bgAudio.loop = true;
    bgAudio.volume = 0.28;
    (async () => { try { await bgAudio.play(); } catch (e) { /* autoplay blocked — will play on user interaction */ } })();
  }

  // Append more cards to the right to enable horizontal scrolling
  const existing = container.querySelectorAll('.card').length;
  const total = 20;
  for (let i = existing + 1; i <= total; i++) {
    const el = document.createElement('article');
    el.className = 'card';
    el.textContent = `Card ${i}`;
    container.appendChild(el);
  }

  // Score handling
  let score = 0;
  const scoreEl = document.getElementById('score');
  const tankBtn = document.querySelector('.tank-button');
  tankBtn?.addEventListener('click', () => {
    score += 1;
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    // shoot bullet and play sound
    shootBullet();

    // spawn a few tiny tanks randomly around the tank
    const btnRect = tankBtn.getBoundingClientRect();
    const count = 1 + Math.floor(Math.random() * 2); // 1-2 tiny tanks
    for (let i = 0; i < count; i++) {
      const rx = btnRect.left + btnRect.width * (0.2 + Math.random() * 0.7);
      const ry = btnRect.top + btnRect.height * (0.1 + Math.random() * 0.8);
      spawnTiny('tank', rx, ry);
    }
  });

  let grandmaCount = 0;
  let grandmaPrice = 25;
  const cashAudio = document.getElementById('cash-audio');
  const popAudio = document.getElementById('pop-audio');
  const grandmaImg = document.getElementById('grandma');
  const grandmaOwnedEl = document.getElementById('grandma-owned');
  const grandmaPriceEl = document.getElementById('grandma-price');
  if (grandmaPriceEl) grandmaPriceEl.textContent = `Price: ${grandmaPrice}`;
  grandmaImg?.addEventListener('click', () => {
    if (score < grandmaPrice) return;
    score -= grandmaPrice;
    grandmaCount += 1;
    grandmaPrice = Math.ceil(grandmaPrice * 1.33);
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    if (grandmaOwnedEl) grandmaOwnedEl.textContent = `Owned: ${grandmaCount}`;
    if (grandmaPriceEl) grandmaPriceEl.textContent = `Price: ${grandmaPrice}`;
    // play cash sound on successful purchase
    if (cashAudio) { try { cashAudio.currentTime = 0; cashAudio.play(); } catch(e){} }
  });
  setInterval(() => {
    if (grandmaCount > 0) {
      // add score and spawn tiny grandmas for each grandma income tick
      for (let i = 0; i < grandmaCount; i++) {
        score += 1;
        // play pop sound for each grandma +1
        if (popAudio) { try { popAudio.currentTime = 0; popAudio.play(); } catch(e){} }
        // position around the grandma image with slight randomness
        const gRect = grandmaImg ? grandmaImg.getBoundingClientRect() : { left: 100, top: window.innerHeight - 120, width: 60, height: 60 };
        const rx = gRect.left + gRect.width * (0.2 + Math.random() * 0.6);
        const ry = gRect.top + gRect.height * (0.1 + Math.random() * 0.8);
        spawnTiny('grandma', rx, ry);
      }
      if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    }
  }, 1000);

  // Czech Republic clock (Europe/Prague)
  const czLocalEl = document.getElementById('cz-local');
  const czIsoEl = document.getElementById('cz-iso');
  const czUnixEl = document.getElementById('cz-unix');

  function pad(n) { return n.toString().padStart(2, '0'); }

  function updateCzClock() {
    const now = new Date();
    // create a string for Prague by using toLocaleString with timeZone
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Prague',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    const localStr = `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
    if (czLocalEl) czLocalEl.textContent = localStr + ' (CET/CEST)';

    // ISO-like local (YYYY-MM-DDTHH:MM:SS) in Prague (no offset)
    const isoLocal = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    if (czIsoEl) czIsoEl.textContent = isoLocal;

    // Unix timestamp (seconds) for Prague local time: compute from the same wall-time by constructing Date from parts in UTC equivalent
    // Simpler: show epoch seconds of the instant (UTC) — user will get current unix timestamp
    const unixSec = Math.floor(now.getTime() / 1000);
    if (czUnixEl) czUnixEl.textContent = `Unix: ${unixSec}`;
  }
  updateCzClock();
  setInterval(updateCzClock, 1000);

  function shootBullet() {
    const shot = document.getElementById('shot-audio');
    if (shot) { try { shot.currentTime = 0; shot.play(); } catch(e){} }

    const btn = document.querySelector('.tank-button');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const startX = r.left + r.width * 0.78; // approx barrel tip
    const startY = r.top + r.height * 0.42;

    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    bullet.style.left = `${startX}px`;
    bullet.style.top = `${startY}px`;
    document.body.appendChild(bullet);

    // ensure layout then animate
    requestAnimationFrame(() => {
      const distance = window.innerWidth - startX - 12;
      bullet.style.transform = `translateX(${distance}px)`;
    });

    const cleanup = () => {
      const top = bullet.getBoundingClientRect().top;
      bullet.remove();
      const impact = document.createElement('div');
      impact.className = 'impact';
      impact.style.left = `${window.innerWidth - 8}px`;
      impact.style.top = `${top - 4}px`;
      document.body.appendChild(impact);
      impact.addEventListener('animationend', () => impact.remove(), { once: true });
    };
    bullet.addEventListener('transitionend', cleanup, { once: true });
  }

  // create tiny popup (type: 'tank' | 'grandma'), at coordinates x,y (pixels)
  function spawnTiny(type, x, y) {
    const el = document.createElement('div');
    el.className = `tiny ${type}`;
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 20}px`;

    if (type === 'grandma') {
      const img = document.createElement('img');
      img.src = 'grandma.png';
      img.alt = 'tiny grandma';
      el.appendChild(img);
    } else {
      // inline simplified tank SVG for tiny tank
      el.innerHTML = `<svg viewBox="0 0 240 120" aria-hidden="true" focusable="false">
        <rect x="40" y="50" width="120" height="35" rx="6" fill="#2f3b45"/>
        <rect x="100" y="30" width="70" height="25" rx="4" fill="#3d4a56"/>
        <rect x="165" y="38" width="55" height="10" rx="3" fill="#3d4a56"/>
        <circle cx="60" cy="92" r="12" fill="#1e272e"/><circle cx="95" cy="92" r="12" fill="#1e272e"/>
        <circle cx="130" cy="92" r="12" fill="#1e272e"/><circle cx="165" cy="92" r="12" fill="#1e272e"/>
      </svg>`;
    }

    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
});
// ...existing code...