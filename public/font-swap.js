// BF_PORTAL_v789_CSP - the font stylesheet loads as media="print" so it never blocks the first paint, and
// switches to media="all" once loaded. This used to be an inline onload="" handler, which the
// Content-Security-Policy can only allow with script-src 'unsafe-inline'.
(function () {
  var links = document.querySelectorAll('link[data-font-swap]');
  for (var i = 0; i < links.length; i += 1) {
    var link = links[i];
    var swap = function (l) { return function () { l.media = 'all'; }; }(link);
    if (link.sheet) swap();
    else link.addEventListener('load', swap, { once: true });
  }
})();
