# Patients : l'aperçu suit le curseur

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

Ouvert depuis la liste Patients (Espace, A ou le bouton œil), l'aperçu devient **non modal**.

- **Pas de voile sur la liste**, et le focus reste sur la liste.
- **↑ ↓ déplacent le curseur, et l'aperçu suit** : Rex, puis Simba, puis Nala, sans fermeture ni animation entre deux patients. L'onglet ouvert (Synthèse, Visites, Suivi préventif) est conservé d'un patient à l'autre.
- **Espace une seconde fois** sur le même patient ferme l'aperçu, comme dans Linear.
- **Échap** ferme l'aperçu et laisse le curseur en place.
- **Entrée**, aperçu ouvert, va un cran plus loin : elle ouvre le dossier détaillé, comme le bouton « Ouvrir le dossier détaillé ». L'aperçu se ferme.
- **Un clic dans la liste** ferme l'aperçu.
- **Avec le focus dans l'aperçu**, seules ↑ ↓ atteignent la liste. Les autres touches restent à l'aperçu.

## Ce qui ne change pas

- Ouvert depuis le tableau de bord, Flux ou l'Agenda, l'aperçu reste **modal**, avec son voile, comme avant (`apres/apercu-modal-ailleurs`).
- Le contenu de l'aperçu est identique.

## Vérification

Au clavier, dans l'instance de test :
1. ↓ puis Espace ouvrent Rex.
2. ↓ affiche Simba.
3. ↓ ↓ affichent Bella.
4. Espace ferme l'aperçu.
5. ↑ puis Espace ouvrent Nala.
6. Échap ferme l'aperçu.
7. Rouvert, Entrée mène au dossier de Simba (`#/patient/demo_patient_04`).

Pendant tout le parcours, le focus est resté sur la page et aucun voile n'est apparu.

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 143 fichiers, 1 095 tests verts. La mécanique du curseur dépend du DOM et n'a pas de test unitaire : elle est vérifiée par le parcours ci-dessus.

## Captures

- `avant/apercu-modal` : l'aperçu d'avant, avec le voile flouté sur la liste.
- `apres/` :
  - `apercu-espace-rex` : ouverture par Espace ;
  - `apercu-fleche-simba` : après ↓ ;
  - `apercu-modal-ailleurs` : l'aperçu modal, inchangé hors de la liste.
