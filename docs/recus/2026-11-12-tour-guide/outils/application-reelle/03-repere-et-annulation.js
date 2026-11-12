const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
const box = (e)=>e&&e.getBoundingClientRect();
const same = (a,b)=>a&&b&&Math.abs(a.x-b.x)<2&&Math.abs(a.width-b.width)<2;
const plus = document.querySelector('button[aria-label="Actions rapides"]');
const r0 = same(box(document.querySelector('.tour-ring')), box(plus));
H.press(plus); await wait(900);
const item = ()=>[...document.querySelectorAll('.quick-actions-menu-item')].find(e=>e.textContent.trim()==='Rendez-vous');
const r1 = same(box(document.querySelector('.tour-ring')), box(item()));
H.press(item()); await wait(2200);
const hiddenInForm = !document.querySelector('.tour-ring');
const textInForm = document.querySelector('.tour-card-text')?.innerText;
// annuler le formulaire : le repère doit revenir sur « + »
H.press(H.byText('[role=dialog] button', /^Annuler$/) || document.querySelector('[role=dialog] button[aria-label="Fermer"]')); await wait(1500);
const r2 = same(box(document.querySelector('.tour-ring')), box(plus));
return { ringOnPlus: r0, ringOnItem: r1, hiddenInForm, textInForm, ringBackAfterCancel: r2, textAfterCancel: document.querySelector('.tour-card-text')?.innerText, step: JSON.parse(localStorage.getItem('baitari-guided-tour-v1')).step };
