// BF_PORTAL_v876_NATIVE_DESKTOP - find the company for a work email or mobile number, then open its staff portal. The lookups run in the app
// (find_company) because this page is not on the internet and the servers' CORS rules would refuse it.
(function () {
  "use strict";
  var MESSAGES = {
    none: "We couldn't find an account for that email or number. Check it, or ask your administrator to add you.",
    rate_limited: "Too many tries. Please wait a few minutes and try again.",
    unavailable: "We couldn't reach the sign-in service. Check your connection and try again.",
  };
  var $ = function (id) { return document.getElementById(id); };
  var form = $("find"), input = $("identifier"), go = $("go"), error = $("error"), pick = $("pick"), list = $("companies");

  function invoke(cmd, args) {
    var t = window.__TAURI_INTERNALS__;
    if (!t || typeof t.invoke !== "function") return Promise.reject("unavailable");
    return t.invoke(cmd, args || {});
  }
  function phoneFrom(raw) {
    var s = String(raw || "").trim();
    if (!s || s.indexOf("@") >= 0 || /[^0-9+().\s-]/.test(s)) return null;
    var d = s.replace(/\D/g, "");
    if (d.length === 10) return "+1" + d;
    if (d.length === 11 && d.charAt(0) === "1") return "+" + d;
    return null;
  }
  function looksLikeIdentifier(raw) {
    var s = String(raw || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || phoneFrom(s) !== null;
  }
  function showError(kind) {
    error.textContent = MESSAGES[kind] || MESSAGES.unavailable;
    error.hidden = false;
  }
  function choose(c) {
    go.disabled = true;
    invoke("choose_company", { name: c.name, portalUrl: c.portal_url }).catch(function () {
      go.disabled = false;
      showError("unavailable");
    });
  }

  input.addEventListener("input", function () {
    go.disabled = !looksLikeIdentifier(input.value);
    error.hidden = true;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (go.disabled || !looksLikeIdentifier(input.value)) return;
    go.disabled = true;
    go.textContent = "Finding your company...";
    error.hidden = true;
    invoke("find_company", { identifier: input.value.trim() }).then(function (found) {
      found = Array.isArray(found) ? found : [];
      if (found.length === 0) { showError("none"); return; }
      if (found.length === 1) { choose(found[0]); return; }
      list.textContent = "";
      found.forEach(function (c) {
        var li = document.createElement("li");
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = c.name;
        b.addEventListener("click", function () { choose(c); });
        li.appendChild(b);
        list.appendChild(li);
      });
      form.hidden = true;
      pick.hidden = false;
    }).catch(function (err) {
      showError(err === "rate_limited" ? "rate_limited" : "unavailable");
    }).then(function () {
      go.textContent = "Continue";
      go.disabled = !looksLikeIdentifier(input.value);
    });
  });

  $("back").addEventListener("click", function () {
    pick.hidden = true;
    form.hidden = false;
    input.focus();
  });
})();
