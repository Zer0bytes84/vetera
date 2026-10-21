# Incident du 21 octobre 2026 : saisies envoyées vers l'instance réelle

Constat établi en lecture seule. Depuis le constat, l'app réelle n'a plus été touchée, ni par AppleScript ni autrement. Aucune étape de remise en état n'a été exécutée.

## Réponse courte

**Aucune donnée clinique n'a été modifiée, ni dans l'instance réelle, ni dans l'instance de copie.**

Patients, propriétaires, rendez-vous, soins, séjours, constantes, rappels, factures, règlements, avoirs, stock, documents et journal d'audit sont identiques, ligne pour ligne, à la sauvegarde prise à 15 h 00, avant l'incident. Il n'y a donc **aucune donnée clinique à remettre en état**.

Seule la table de réglages techniques `app_settings` a bougé dans la base réelle, sur deux lignes que l'application met à jour d'elle-même. Elles sont détaillées plus bas.

## Ce qui s'est passé

Heures locales du Mac (UTC−4).

| Heure | Fait |
| --- | --- |
| 9 h 53 | Tu lances `tauri:dev` (PID 64851), qui lit la base réelle. |
| 15 h 00 | Je fais une sauvegarde cohérente de la base réelle, en lecture seule (`sqlite3 "file:…?mode=ro" ".backup …"`), dans le dossier temporaire de la session. |
| 15 h 01 | Je lance une seconde instance sur cette copie (PID 5730, `BAITARI_DATA_DIR` vers la copie). Ses écritures ne vont que dans la copie. |
| vers 15 h 02 | **Premier envoi par AppleScript.** Mise au premier plan visée sur le PID 5730, clic au point (150, 850) de l'écran, saisie de `location.hash='#/soins'`, puis Entrée. Les deux instances s'appellent `vetera` et macOS active par application : c'est l'instance **réelle** qui est passée au premier plan. Le point (150, 850) tombe sur le Dock, au niveau de l'icône des applications (Launchpad) : le clic a probablement ouvert ce panneau, qui a alors reçu le texte et l'Entrée. Je ne peux pas l'affirmer. |
| vers 15 h 02 | **Second envoi**, la lettre « a ». L'instance réelle était au premier plan, sur Finances. Sur cet écran, « a » seul n'a aucun effet : l'aperçu par « a » n'existe que dans Patients. |
| 15 h 02 min 30 s | La base réelle réécrit la ligne de licence (`license_credentials_v2`, champ `lastSeen`), avec le même jeton, émis à 14 h 51. Le moment coïncide avec la mise au premier plan : c'est l'enregistrement automatique de présence de la licence. |
| 15 h 04 | Je constate le problème sur une capture d'écran et j'arrête tout pilotage. |
| 15 h 07 et 15 h 14 | L'instance réelle vérifie les mises à jour, puis renouvelle sa licence : c'est son fonctionnement normal. |
| vers 15 h 08 | J'arrête l'instance de copie (PID 5730). |

**Si le texte avait atteint l'app réelle,** le scénario aurait été le suivant :
- sans champ actif, la touche **N** (présente dans « location » et « soins ») ouvre l'Agenda et le formulaire « Nouveau rendez-vous » ;
- les caractères suivants seraient allés dans son premier champ, puis Entrée aurait tenté de valider ;
- sans patient choisi, le formulaire ne s'enregistre pas.

La comparaison le confirme : le nombre de rendez-vous est resté à 50, et aucune ligne de rendez-vous n'a changé. Je ne peux pas dire si ce scénario a eu lieu ou si le Dock a tout reçu. L'écran Finances visible à 15 h 02 a pu être ouvert par toi.

## Preuve

- Une sauvegarde de la base réelle a été prise en lecture seule à 15 h 15. Son contenu complet (`.dump`) a été comparé à celui de la sauvegarde de 15 h 00.
- La comparaison ne montre que 2 lignes différentes, toutes deux dans `app_settings`. Elle est jointe dans `preuves/diff-base-reelle-15h00-15h15.txt`, jeton de licence masqué.

| Ligne de `app_settings` | Dans la sauvegarde de 15 h 00 | Dans la base réelle à 15 h 15 | Qui l'a écrite |
| --- | --- | --- | --- |
| `updates.last_checked_at` | 19:01:29 UTC | 19:07:53 UTC (15 h 07 locale) | Vérification automatique des mises à jour de l'instance réelle. |
| `license_credentials_v2` | Valeur écrite à 15 h 06 par l'instance de copie, **dans la copie** | Jeton émis à 15 h 07, ligne écrite à 15 h 14 | Renouvellement automatique de la licence de l'instance réelle. |

La sauvegarde de 15 h 00 a ensuite été modifiée par l'instance de copie, mais seulement sur ces deux réglages, ce qui explique la colonne du milieu. Tout le reste de la copie est resté identique à la base réelle de 15 h 00, et identique à la base réelle de 15 h 15.

**Hors de la base :**
- Les deux instances partagent le même stockage du navigateur intégré (`~/Library/WebKit/vetera`). L'instance de copie a pu y écrire des préférences d'affichage (thème, dernière ligne ouverte). Ce ne sont pas des données cliniques.
- Le texte a peut-être été tapé dans le panneau des applications de macOS. Je ne vois aucune trace d'une application lancée.

## État actuel

- **Base réelle :** données cliniques intactes. Les deux réglages techniques sont à jour, tenus par l'instance réelle elle-même.
- **Instance réelle (PID 64851) :** toujours ouverte, non touchée depuis 15 h 04. Un formulaire « Nouveau rendez-vous » vide est peut-être resté ouvert, si le texte l'a atteinte. Il suffit de le fermer sans enregistrer.
- **Instance de copie :** arrêtée. Sa base reste dans le dossier temporaire de la session, hors du projet et hors du dossier de la clinique.

## Étapes de remise en état (préparées, NON exécutées)

Aucune donnée clinique n'est à restaurer. Les étapes ci-dessous servent à revérifier par toi-même, puis, seulement si tu le décides, à annuler les deux réglages.

### 1. Revérifier, en lecture seule

L'app peut rester ouverte.

```bash
mkdir -p ~/baitari-verif
```

```bash
sqlite3 "file:$HOME/Library/Application Support/com.baitari.vetera/baitari.db?mode=ro" ".backup '$HOME/baitari-verif/maintenant.db'"
```

```bash
sqlite3 ~/baitari-verif/maintenant.db "select count(*) from appointments; select count(*) from invoices; select count(*) from payments; select count(*) from care_tasks; select count(*) from tasks; select count(*) from patients; select max(created_at) from audit_log;"
```

Valeurs attendues :
- 50 rendez-vous, 41 factures, 44 paiements, 1 soin, 6 rappels manuels, 10 patients ;
- la dernière entrée du journal d'audit doit dater d'avant 15 h 00 (19 h 00 UTC), sauf si tu as travaillé dans l'app depuis.

### 2. Annuler les deux réglages : déconseillé

- `updates.last_checked_at` : sa valeur précédente ne fait que retarder la prochaine vérification de mise à jour. Aucun effet sur les données.
- `license_credentials_v2` : le jeton actuel est valide et a été renouvelé par l'app. Remettre un jeton antérieur pourrait faire redemander l'activation de la licence. **Il n'y a pas d'état antérieur fiable à restaurer pour la base réelle :** la seule copie de 15 h 00 a été modifiée par l'instance de copie.

Si tu tiens malgré tout à revenir à un état antérieur complet :

1. Quitter Baitari (fermer la fenêtre, puis arrêter `tauri:dev`).
2. Sauvegarder l'état actuel :

   ```bash
   sqlite3 "$HOME/Library/Application Support/com.baitari.vetera/baitari.db" ".backup '$HOME/baitari-verif/avant-restauration.db'"
   ```

3. Choisir une sauvegarde de l'app, datée d'avant aujourd'hui, dans le dossier `backups` de la clinique.

   **Attention :** elle ferait perdre tout ce qui a été saisi depuis sa date. Je ne le recommande pas, puisque rien n'est à réparer.

## Mesures prises

- Pilotage par AppleScript abandonné. Une mémoire de session le rappelle désormais : pas d'AppleScript quand l'instance réelle tourne.
- Toute vérification sur données réelles passe par une copie en lecture seule, un recalcul en SQL et des captures par numéro de fenêtre. Les clics dans une fenêtre native attendront que tu sois devant le Mac.
