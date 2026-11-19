# Copie masquée de la base du banc et du store du navigateur : noms fictifs, textes cliniques vidés, quatre consultations ZZ-TEST.
import sqlite3, json
db=sqlite3.connect('base-recherche.db')
st=json.load(open('/home/parallels/work/whatsapp-banc/store.json'))
T=st['tables']
animals=['Biscotte','Caramel','Filou','Gribouille','Noisette','Pompon','Réglisse','Tango','Vanille','Zéphyr','Praline']
pmap={pid:animals[i] for i,(pid,) in enumerate(db.execute("select id from patients where id not like 'zz-%' order by id").fetchall())}
firsts=['Amel','Bilal','Chahra','Djamel','Farid','Hana','Idir','Lina','Malik','Nour','Rania','Sami','Yasmine','Walid','Zina']
lasts=['Arbi','Bensaid','Chikh','Dali','Ferhat','Ghali','Hamdi','Ilyes','Kaci','Lounes','Madi','Nadir','Ouali','Rahmi','Selmi']
omap={oid:(f"ZZ-TEST {firsts[k%15]}", lasts[k%15]) for k,(oid,) in enumerate(db.execute("select id from owners order by id").fetchall())}
for pid,n in pmap.items(): db.execute("update patients set name=?, general_notes='', allergies='', chronic_conditions='' where id=?",(n,pid))
for oid,(f,l) in omap.items(): db.execute("update owners set first_name=?, last_name=?, phone='0555 00 00 00', email='', address='', communication_notes='', secondary_contact_name='', secondary_contact_phone='' where id=?",(f,l,oid))
db.execute("update consultation_soaps set subjective='',objective='',assessment='',plan='',content='',transcript='',ai_draft=''")
db.execute("update notes set title='Note ZZ-TEST', content=''")
db.execute("update documents set patient_name=coalesce((select name from patients p where p.id=documents.patient_id),'ZZ-TEST'), contenu_genere='', titre='Document ZZ-TEST'")
db.execute("update users set display_name='Vétérinaire masqué', email='banc-'||id||'@example.com'")
soaps=[('zz-s1','zz-p3',"Rappel annuel du vaccin CHPPiL, propriétaire signale une toux légère depuis trois jours.","Température 38,6 °C, auscultation normale, nœuds lymphatiques non réactionnels.","Animal en bonne santé, toux de chenil possible.","Vaccin CHPPiL injecté, rappel dans un an. Surveiller la toux."),
       ('zz-s2','zz-p4',"Chat âgé, polyuro-polydipsie et amaigrissement depuis un mois.","Déshydratation 5 %, reins petits à la palpation, créatinine 310 µmol/L.","Insuffisance rénale chronique (IRC) stade 3 IRIS.","Aliment rénal, bénazépril, contrôle de la créatinine dans quatre semaines."),
       ('zz-s3','zz-p2',"Boiterie postérieure gauche après une course, douleur à la manipulation du grasset.","Tiroir négatif, épanchement articulaire modéré.","Entorse du grasset gauche, arthrose débutante.","Méloxicam (Metacam) 0,1 mg/kg pendant cinq jours, repos strict."),
       ('zz-s4','zz-p1',"Plaie infectée à la patte avant droite, écoulement purulent.","Abcès sous-cutané de 2 cm, hyperthermie 39,4 °C.","Infection bactérienne cutanée.","Drainage, amoxicilline-acide clavulanique (Synulox) 12,5 mg/kg deux fois par jour pendant sept jours.")]
for sid,pid,s,o,a,p in soaps:
  db.execute("insert or replace into consultation_soaps(id,appointment_id,patient_id,subjective,objective,assessment,plan,created_at) values(?,?,?,?,?,?,?,?)",(sid,'zz-a-'+sid,pid,s,o,a,p,'2026-11-10T09:00:00.000Z'))
db.commit()
for p in T['patients']:
  if p['id'] in pmap: p['name']=pmap[p['id']]
  for k in ('generalNotes','allergies','chronicConditions'):
    if isinstance(p.get(k),str): p[k]=''
for o in T['owners']:
  o['firstName'],o['lastName']=omap.get(o['id'],('ZZ-TEST Test','Masqué'))
  o['phone']='0555 00 00 00'
  for k in ('email','address'):
    if k in o: o[k]=''
for a in T['appointments']:
  if a.get('notes'): a['notes']=''
for n in T['notes']: n['title']='Note ZZ-TEST'; n['content']=''
for s in T['consultation_soaps']:
  for k in ('subjective','objective','assessment','plan','content','transcript'):
    if isinstance(s.get(k),str): s[k]=''
for u in T['users']:
  for k in ('displayName','display_name'):
    if k in u: u[k]='Vétérinaire masqué'
json.dump(st,open('store-recherche.json','w'),ensure_ascii=False)
print([p['name'] for p in T['patients']]); print([(o['firstName'],o['lastName']) for o in T['owners']][:4])
print(sorted({a['title'] for a in T['appointments']}))
print(list(T['users'][0].keys()))
# Appointment titles carry the patient's name: rebuild them with the masked names (store and base).
import re
old={}
src=json.load(open('/home/parallels/work/whatsapp-banc/store.json'))['tables']
for p in src['patients']: old[p['id']]=p['name']
new={p['id']:p['name'] for p in T['patients']}
def fix(title,pid):
  t=title or ''
  for oid,on in old.items():
    if on and on!=new.get(oid) and on in t: t=t.replace(on,new.get(oid,'ZZ-TEST'))
  return t
for a in T['appointments']: a['title']=fix(a.get('title'),a.get('patientId'))
json.dump(st,open('store-recherche.json','w'),ensure_ascii=False)
for (aid,title) in db.execute("select id,title from appointments").fetchall():
  db.execute("update appointments set title=?, notes='' where id=?",(fix(title,None),aid))
db.commit()
print(sorted({a['title'] for a in T['appointments']}))
print(sorted({r[0] for r in db.execute("select title from appointments")}))
