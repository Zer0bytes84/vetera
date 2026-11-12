const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
const before = JSON.parse(localStorage.getItem('baitari-guided-tour-v1'));
H.press(H.byText('[role=dialog] button', /^Ajouter au planning/));
await H.waitFor(() => JSON.parse(localStorage.getItem('baitari-guided-tour-v1')).step === 2, 15000, 'étape 3 après le rendez-vous');
await wait(800);
const st = JSON.parse(localStorage.getItem('baitari-guided-tour-v1'));
return { before: before.step, st, card: document.querySelector('.tour-card')?.innerText, toasts: H.toasts(), ringOnAgenda: (()=>{ const r=document.querySelector('.tour-ring')?.getBoundingClientRect(); const a=[...document.querySelectorAll('[data-slot="sidebar-menu-button"]')].find(b=>b.getAttribute('aria-label')?.startsWith('Agenda'))?.getBoundingClientRect(); return {ring: !!r, onAgenda: r&&a? Math.abs(r.x-a.x)<2:null, hash: location.hash}; })() };
