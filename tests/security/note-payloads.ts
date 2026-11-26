/**
 * Des contenus de note piégés, tels qu'ils pourraient arriver par une restauration, un import ou un poste pair :
 * jamais par l'éditeur, dont le schéma les filtre. Chacun doit sortir du filtre sans rien d'actif.
 */
export const NOTE_PAYLOADS: Array<{ name: string; html: string }> = [
  { name: "img onerror", html: '<p>a</p><img src=x onerror="alert(1)">' },
  { name: "img en majuscules", html: '<IMG SRC=x ONERROR="alert(1)">' },
  { name: "img sans guillemets", html: "<img src=x onerror=alert(1)//>" },
  {
    name: "caractère nul dans l'attribut",
    html: `<img src=x on${String.fromCharCode(0)}error=alert(1)>`,
  },
  { name: "svg onload", html: '<svg onload="alert(1)"></svg>' },
  { name: "svg script", html: "<svg><script>alert(1)</script></svg>" },
  {
    name: "svg animate",
    html: '<svg><animate onbegin="alert(1)" attributeName=x dur=1s>',
  },
  {
    name: "iframe srcdoc",
    html: '<iframe srcdoc="<script>parent.alert(1)</script>"></iframe>',
  },
  {
    name: "iframe javascript",
    html: '<iframe src="javascript:alert(1)"></iframe>',
  },
  { name: "lien javascript", html: '<a href="javascript:alert(1)">x</a>' },
  {
    name: "lien javascript en majuscules",
    html: '<a href="JaVaScRiPt:alert(1)">x</a>',
  },
  {
    name: "lien javascript et tabulation",
    html: '<a href="jav&#x09;ascript:alert(1)">x</a>',
  },
  {
    name: "lien javascript et espace",
    html: '<a href=" javascript:alert(1)">x</a>',
  },
  {
    name: "lien javascript en entité",
    html: '<a href="&#106;avascript:alert(1)">x</a>',
  },
  { name: "lien vbscript", html: '<a href="vbscript:msgbox(1)">x</a>' },
  {
    name: "lien data html",
    html: '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  },
  {
    name: "lien relatif au protocole",
    html: '<a href="//evil.example/x">x</a>',
  },
  { name: "balise script", html: "<script>alert(1)</script><p>après</p>" },
  { name: "script avec type", html: '<script type="module">alert(1)</script>' },
  { name: "input autofocus", html: '<input autofocus onfocus="alert(1)">' },
  { name: "input texte", html: '<input type="text" value="saisie">' },
  {
    name: "details ontoggle",
    html: '<details open ontoggle="alert(1)"><summary>x</summary></details>',
  },
  {
    name: "object data",
    html: '<object data="data:text/html,<script>alert(1)</script>"></object>',
  },
  { name: "embed", html: '<embed src="javascript:alert(1)">' },
  { name: "onclick", html: '<p onclick="alert(1)">x</p>' },
  {
    name: "formaction",
    html: '<form><button formaction="javascript:alert(1)">go</button></form>',
  },
  {
    name: "form action",
    html: '<form action="javascript:alert(1)"><input type=submit></form>',
  },
  {
    name: "textarea et select",
    html: "<textarea>a</textarea><select><option>b</option></select>",
  },
  { name: "video source", html: '<video><source onerror="alert(1)"></video>' },
  { name: "audio", html: '<audio src=x onerror="alert(1)"></audio>' },
  { name: "marquee", html: '<marquee onstart="alert(1)">x</marquee>' },
  { name: "body onload", html: '<body onload="alert(1)"><p>x</p></body>' },
  { name: "base", html: '<base href="http://evil.example/"><p>x</p>' },
  {
    name: "meta refresh",
    html: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  },
  {
    name: "link feuille de style",
    html: '<link rel="stylesheet" href="http://evil.example/x.css">',
  },
  { name: "style balise", html: "<style>body{display:none}</style><p>x</p>" },
  {
    name: "style import",
    html: '<style>@import url("http://evil.example/x.css");</style>',
  },
  {
    name: "style attribut recouvrant",
    html: '<p style="position:fixed;inset:0;background:red;z-index:99999">x</p>',
  },
  {
    name: "style tableau avec url",
    html: '<table style="background:url(javascript:alert(1))"><tbody><tr><td>x</td></tr></tbody></table>',
  },
  {
    name: "style avec expression",
    html: '<table style="width:expression(alert(1))"><tbody><tr><td>x</td></tr></tbody></table>',
  },
  {
    name: "class sur un code",
    html: '<pre><code class="language-js onclick=alert(1)">x</code></pre>',
  },
  {
    name: "image distante",
    html: '<img src="http://evil.example/balise.png">',
  },
  {
    name: "image data svg",
    html: '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+">',
  },
  {
    name: "mXSS math et table",
    html: '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=alert(1)&gt;">',
  },
  {
    name: "mXSS formulaires imbriqués",
    html: "<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>",
  },
  {
    name: "mXSS svg et style",
    html: '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">',
  },
  {
    name: "mXSS noscript",
    html: '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  },
  {
    name: "commentaire conditionnel",
    html: "<!--><img src=x onerror=alert(1)>-->",
  },
  {
    name: "id et name (écrasement du DOM)",
    html: '<img name="body" id="cookie"><a id="x" name="y">x</a>',
  },
  { name: "attribut data", html: '<p data-evil="1" data-x="alert(1)">x</p>' },
  { name: "attribut aria", html: '<p aria-label="x" role="button">x</p>' },
  {
    name: "target autre que _blank",
    html: '<a href="https://exemple.dz" target="_top">x</a>',
  },
  {
    name: "template",
    html: "<template><img src=x onerror=alert(1)></template>",
  },
  {
    name: "xmp et plaintext",
    html: "<xmp><img src=x onerror=alert(1)></xmp><plaintext><img src=x onerror=alert(1)>",
  },
];
