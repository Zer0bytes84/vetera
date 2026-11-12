H.press(H.byText('button', /^Faire le tour$/)); await new Promise(r=>setTimeout(r,700));
const card = document.querySelector('.tour-card')?.innerText;
const ring0 = !!document.querySelector('.tour-ring');
H.press(document.querySelector('button[aria-label="Actions rapides"]')); await new Promise(r=>setTimeout(r,900));
const ring1 = document.querySelector('.tour-ring')?.getBoundingClientRect();
const item = [...document.querySelectorAll('.quick-actions-menu-item')].find(e=>e.textContent.trim()==='Patient')?.getBoundingClientRect();
H.press([...document.querySelectorAll('.quick-actions-menu-item')].find(e=>e.textContent.trim()==='Patient')); await new Promise(r=>setTimeout(r,1500));
return {card, ring0, ringOnItem: ring1 && item && Math.abs(ring1.x-item.x)<2 && Math.abs(ring1.width-item.width)<2, hash: location.hash, afterClick: document.querySelector('.tour-card')?.innerText, ringGone: !document.querySelector('.tour-ring'), dialog: H.text('[role="dialog"]', 900)};
