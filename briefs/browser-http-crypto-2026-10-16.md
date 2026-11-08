# Test navigateur : API crypto et contexte HTTP

## Cause

Le test depuis l’adresse IP réseau en HTTP ne dispose pas de `crypto.randomUUID()` ni de `crypto.subtle`. Sur le même Mac, `http://localhost:5180` fournit le contexte de confiance requis par ces API.

Référence : https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID et https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues.

## Correctif

- Helper UUID v4 utilisant l’API native quand elle existe, sinon `crypto.getRandomValues`. Aucun repli sur Math.random.
- Remplacement des quatre appels directs dans l’identité d’installation et les identifiants de facturation.
- Activation et renouvellement : message français expliquant localhost/HTTPS si la vérification cryptographique n’est pas disponible. Refus avant toute requête, aucune validation de licence contournée.
- Les clés et signatures restent vérifiées par les contrôles existants.

## Validation

Typecheck 0 erreur. ESLint 0 erreur, 0 avertissement. Vitest : 750 tests, 98 fichiers, tous réussis.

Chromium et WebKit : 16 contrôles (8 par moteur) sur les véritables origines HTTP réseau et localhost. UUID v4 valide sans randomUUID, identité persistante, message explicite sur HTTP réseau, aucune requête d’activation dans ce contexte, et requête localhost dirigée exclusivement vers un serveur simulé. Aucune clé réelle utilisée et aucune licence réelle activée ou modifiée.

Correctif actif dans le serveur de développement. Aucun build natif, push, tag ou release réalisé pour ce correctif.
