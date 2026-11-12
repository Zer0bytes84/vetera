const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
H.press(document.querySelector('button[aria-label="Actions rapides"]')); await wait(800);
H.press([...document.querySelectorAll('.quick-actions-menu-item')].find(e=>e.textContent.trim()==='Rendez-vous')); await wait(2000);
H.setVal(document.querySelector('[role=dialog] input[placeholder^="Nom de l’animal ou du propriétaire"]'), 'ZZ-TEST-Rex'); await wait(1200);
const opt = [...document.querySelectorAll('[role=dialog] button')].find(b=>/ZZ-TEST-Rex/.test(b.innerText));
H.press(opt); await wait(900);
const btns = [...document.querySelectorAll('[role=dialog] button')].map(b=>(b.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean);
return { selected: !!opt, footer: btns.slice(-6), dialogText: document.querySelector('[role=dialog]').innerText.replace(/\s+/g,' ').slice(0,420) };
