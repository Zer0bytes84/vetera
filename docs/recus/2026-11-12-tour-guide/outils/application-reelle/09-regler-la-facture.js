const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const row=[...document.querySelectorAll('tr,li,[role=row]')].find(r=>/INV-2026-000021/.test(r.innerText||''));
H.press([...row.querySelectorAll('button')].find(b=>/^Régler/.test((b.innerText||'').trim()))); await wait(1800);
const d=document.querySelector('[role=dialog]');
return { dialog: d?.innerText.replace(/\s+/g,' ').slice(0,500), fields: d?[...d.querySelectorAll('input,select,button')].map(e=>(e.placeholder||e.getAttribute('aria-label')||(e.innerText||'').replace(/\s+/g,' ').slice(0,30)||e.type)+'='+(e.value||'')).slice(0,20):null };
