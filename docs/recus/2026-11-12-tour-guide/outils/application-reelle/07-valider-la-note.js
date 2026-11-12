const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
H.press(H.byText('button', /Valider la note pour les documents/));
await H.waitFor(() => JSON.parse(localStorage.getItem('baitari-guided-tour-v1')).step === 3, 15000, 'étape 4 après validation');
await wait(600);
return { st: JSON.parse(localStorage.getItem('baitari-guided-tour-v1')), card: document.querySelector('.tour-card')?.innerText, toasts: H.toasts() };
