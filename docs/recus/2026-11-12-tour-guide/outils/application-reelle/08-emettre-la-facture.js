const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const dlg=()=>document.querySelector('[role=dialog]');
const sel=dlg().querySelector('select');
const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; set.call(sel,'mwdxed7cnv8tc80sb5j'); sel.dispatchEvent(new Event('change',{bubbles:true})); await wait(500);
H.setVal(dlg().querySelector('input[placeholder="Consultation, vaccin…"]'),'ZZ-TEST Consultation');
H.setVal(dlg().querySelector('input[placeholder="Montant DA"]'),'3000'); await wait(500);
const st0=JSON.parse(localStorage.getItem('baitari-guided-tour-v1')).step;
H.press(H.byText('[role=dialog] button',/^Émettre la facture/)); await wait(3500);
return { st0, step:JSON.parse(localStorage.getItem('baitari-guided-tour-v1')).step, toasts:H.toasts(), dialog: document.querySelector('[role=dialog]')?.innerText.replace(/\s+/g,' ').slice(0,500) ?? null, card: document.querySelector('.tour-card-text')?.innerText };
