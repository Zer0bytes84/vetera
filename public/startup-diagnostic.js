// Diagnostic d'erreur au démarrage, chargé avant l'application. Un fichier à part et non un script dans index.html :
// la politique de sécurité de l'application (src-tauri/tauri.conf.json) n'autorise aucun script inline.
"use strict";
window.addEventListener("error", (e) => {
  // Preserve React's mounted DOM and render error messages as plain text.
  // A diagnostic must never recreate the application or interpret HTML.
  if (!document.body) return;
  let diagnostic = document.getElementById("startup-error");
  if (!diagnostic) {
    diagnostic = document.createElement("div");
    diagnostic.id = "startup-error";
    diagnostic.setAttribute("role", "alert");
    diagnostic.style.cssText = "color:red;z-index:9999;position:fixed;top:0;left:0;background:white;padding:20px;";
    document.body.appendChild(diagnostic);
  }
  diagnostic.textContent = e.message + "\n" + e.filename + ":" + e.lineno;
});
