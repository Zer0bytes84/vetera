const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const row=[...document.querySelectorAll('tr,li,[role=row]')].find(r=>/ZZ-TEST-Durand/.test(r.innerText||'') && /Régler/.test(r.innerText||''));
H.press([...row.querySelectorAll('button')].find(b=>/^Régler/.test((b.innerText||'').trim()))); await wait(1800);
const t0=Date.now();
H.press(H.byText('[role=dialog] button',/^Confirmer$/));
await H.waitFor(()=>JSON.parse(localStorage.getItem('baitari-guided-tour-v1')).status==='done', 20000, 'tour terminé en direct après le paiement');
const ms=Date.now()-t0; await wait(500);
return { msApresConfirmation: ms, st: JSON.parse(localStorage.getItem('baitari-guided-tour-v1')), card: document.querySelector('.tour-card')?.innerText, errors: H.errors() };
