# Les doses validées par Aïssa dans l'ordonnance, 19 novembre 2026

**Où :** branche `chantier/doses-produit-2026-11-19`, worktree `~/work/doses-wt`, commit local. Rien n'est poussé, fusionné ni tagué.

**La demande :** porter dans le produit les doses qu'Aïssa a relues et trouvées justes (la référence du 18 novembre, 24 molécules, déjà rejouée au harnais sans faux positif), avec « l'écran qui affiche la dose et sa mise en garde mot pour mot ».

## 1. Ce qui change à l'écran

**Sur chaque ligne d'ordonnance dont la molécule est l'une des 24**, un panneau sous la dose :
- **la dose de référence validée pour le poids saisi**, avec son calcul (« 4 mg/kg × 4 kg ») : par kilo, fixe par animal, en mg ou en µg, en plage quand la référence donne une plage ;
- **la voie, la fréquence et la durée** de la référence ;
- **la mise en garde de la référence, mot pour mot,** dans un encadré à part ;
- **qui l'a relue et quand** (« Relue par Aïssa · 18 nov. 2026 ») et **toutes les sources RCP** de la référence.

**Quand la référence ne permet pas de donner une dose, le panneau le dit et dit pourquoi,** sans chiffre calculé :
- la dose n'est pas écrite en nombre dans la référence (Antisedan, Glucantime, Karsivan) : le texte de la référence est cité ;
- le poids est hors de la tranche que la référence écrit (Capstar de 1 à 11 kg, Prilium au-dessus de 4 kg) ;
- l'espèce n'a pas de ligne dans la référence, ou n'est pas reconnue ;
- le poids manque (sauf pour une dose fixe par animal sans tranche, comme le carbimazole) ou n'est pas vraisemblable pour l'espèce.

Dans chacun de ces cas, le panneau ajoute : « La dose saisie sur la ligne ne vient pas de cette référence : la vérifier avant de signer. »

**Ce qui ne change pas :**
- la ligne reste au vétérinaire : le panneau n'écrit rien dans l'ordonnance ;
- l'ordonnance imprimée et son aperçu sont identiques : la seule modification du code existant fait 7 lignes dans l'éditeur (afficher le panneau, lui passer l'espèce) ;
- pour une molécule hors des 24, rien de nouveau ne s'affiche.

## 2. Comment c'est garanti

**`src/modules/prescriptions/lib/validated-doses.ts`** ne lit que la référence relue (`doses-validees-aissa.json`, copiée telle qu'Aïssa l'a validée) :
- **une molécule n'est dite validée que si le catalogue du produit lui est identique, champ pour champ** (dose, voie, fréquence, durée, mise en garde, noms commerciaux). Le jour où le catalogue change une virgule, le panneau disparaît au lieu d'afficher une validation périmée ;
- les tranches de poids sont relues dans le texte même de la mise en garde (test) ;
- aucun nombre n'est tiré d'un texte que la référence marque « REFUS ».

**Les tests** (10 sur la logique, 6 sur le panneau) :
- les 24 molécules sont celles de la référence, champ pour champ ;
- les doses par kilo, fixes, en µg ;
- la mise en garde vient mot pour mot ;
- les tranches de poids, les refus et leurs raisons ;
- le panneau ne nomme jamais un refus « validée », et les très petites doses gardent trois décimales.

**Dans l'app assemblée comme la release** (navigateur, copie masquée de la base, clair et sombre), au clic, depuis le dossier d'un chat : onglet Ordonnances, Nouvelle ordonnance, poids, Ajouter un médicament, recherche, choix. Trois cas : Tolfedine à 4 kg (dose), Capstar à 12 kg (hors tranche), Antisedan (dose non chiffrée). Captures dans `captures/`, relevé dans `releve-navigateur.json`, aucune erreur en console.

**Contrastes mesurés sur les pixels des captures** :

| Élément | Clair | Sombre |
|---|---|---|
| Texte gris | 5,69:1 | 7,0:1 |
| Titre | 13,6:1 | 14,7:1 |
| Icône | 4,31:1 au moins | 6,57:1 au moins |

**Contrôles :** typecheck 0, lint 0, **2 131 tests verts sur 2 131**.

## 3. L'équipe rouge

**Elle a sondé 8 184 cas** : 24 molécules × 11 valeurs d'espèce × 31 poids, dont NaN, 0, négatifs, les bornes de tranche à 0,0001 près, 1e6 et l'infini.
- **Aucun faux positif silencieux.** Aucune dose quand la référence refuse, aucun refus quand elle donne une dose, toutes les valeurs à moins de 0,0005 près.
- Les espèces ne se croisent pas, et aucun nom commercial ne mène à la mauvaise molécule.

**Corrigé et rejoué :**
1. Un refus était annoncé « Dose de référence validée » aux lecteurs d'écran : le nom dit maintenant le refus et la molécule.
2. Les très petites doses étaient arrondies à deux décimales, jusqu'à 7,5 % d'écart (lopéramide à 0,3 kg) : trois décimales maintenant.
3. Le texte gris tombait à 4,4:1 en clair, l'icône verte à 2,4:1 : voir le tableau ci-dessus.
4. Les raisons de refus fausses :
   - « espèce non renseignée » pour une espèce saisie mais non reconnue ;
   - le carbimazole refusé sans poids, alors que sa dose est fixe ;
   - les espèces en clés brutes.
5. **Trouvé en mesurant, pas par l'équipe rouge :** le thème Clean grise tout paragraphe sans classe `text-`. Le titre et la dose sortaient en gris. Le panneau n'utilise plus de paragraphes.

## 4. À trancher par toi : le calculateur existant contredit la référence

Le calcul « Calculé » existant, juste sous le panneau, préremplit la ligne à partir du catalogue avec un analyseur de texte plus ancien. **L'équipe rouge l'a pris en défaut sur 4 molécules** :

| Molécule | Cas | « Calculé » existant | Référence |
|---|---|---|---|
| **Glucantime (antimoniate de méglumine), chien** | tout poids | **27 mg au total** | **27 mg/kg, soit 270 mg à 10 kg : sous-dosage de 10 fois, 30 fois à 30 kg** |
| Capstar | chat ou chien hors de 1 à 11 kg | 11,4 mg | aucune dose hors de la tranche |
| Prilium | chien de 4 kg ou moins | 1 mg à 4 kg | aucune dose à 4 kg ou moins |
| Galastop (cabergoline), Antisedan, Karsivan | chien | 0 mg (« 5 µg/kg » n'est pas lu) | 50 µg à 10 kg pour le Galastop |

- **Ce n'est pas un défaut du port,** et il existe dans la 5.1.1 publiée. Le panneau le rend visible sur la même carte, et il avertit sur chaque refus.
- **Je n'ai pas touché au calculateur sans ton mot :** c'est lui qui remplit l'ordonnance imprimée.
- **Le Glucantime est le plus grave :** un chiffre 10 à 30 fois trop bas peut partir sur une ordonnance signée.
- **Ce que je propose :** pour les 24 molécules validées, que la ligne soit préremplie depuis la référence (ou laissée vide quand la référence refuse), au lieu de l'analyseur. Les autres molécules restent sur l'analyseur. Il faudrait aussi corriger l'analyseur pour « mg d'antimoine/kg » et « µg/kg ».

## 5. À faire trancher par Aïssa

La référence écrit parfois plusieurs doses selon le cas. Le panneau affiche en gros la dose principale et, mot pour mot dans sa mise en garde, les autres :
- **carbimazole chat :** 15 mg en gros ; « 10 mg si la TT4 est entre 50 et 100 nmol/L » dans la mise en garde ;
- **butorphanol chien :** sédation avec médétomidine à 0,1 mg/kg ;
- **imidocarbe :** prophylaxie et anaplasmose à d'autres doses ;
- **xylazine bovins :** en IV lente, à réduire ;
- **ramipril :** jusqu'à 0,25 mg/kg.

Est-ce la présentation qu'elle veut ?

## 6. Ce qui n'est pas prouvé

- **L'app de bureau (WebKit) n'a pas été lancée** : la VM ne construit pas Tauri. Ton test en tauri dev le montrera.
- **Une seule ligne par ordonnance** a été vue au navigateur ; plusieurs lignes ne sont prouvées que par le code (un panneau par ligne, chacun nommé par sa molécule).
- **Les espèces que le catalogue ne reconnaît pas** (« Porc », « Félin », « Jument ») donnent un refus et non la dose de leur espèce : c'est sûr, mais c'est une perte. La table des espèces du catalogue est hors de ce chantier.
- **Le lecteur d'écran n'a pas été écouté.**
