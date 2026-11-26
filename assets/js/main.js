/* TRIANGUL — scripts du site (sans dépendance). */
(function () {
  "use strict";

  var body = document.body;
  var ROOT = body.getAttribute("data-root") || "";
  var EMAIL = body.getAttribute("data-contact") || "";
  var eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var num = new Intl.NumberFormat("fr-FR");
  var STATUTS = { lancement: "Lancement commercial", dernieres: "Dernières opportunités", travaux: "Travaux en cours", livre: "Livré" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Mesure d'audience : événements de conversion (Plausible si activé, sinon dataLayer) */
  function track(name, props) {
    try {
      if (typeof window.plausible === "function") window.plausible(name, { props: props || {} });
      (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, props || {}));
    } catch (e) { /* sans effet sur la navigation */ }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-track]");
    if (a) track(a.getAttribute("data-track"), { page: location.pathname });
  });

  /* Menu mobile et en-tête */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () { body.classList.remove("nav-open"); toggle.setAttribute("aria-expanded", "false"); });
    });
  }
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 40); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Apparition au défilement */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px" }) : null;
  function observe(scope) {
    (scope || document).querySelectorAll(".reveal:not(.in)").forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });
  }
  observe();

  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Vidéo d'accueil : lecture automatique sauf mouvement réduit ou économie de données */
  var video = document.querySelector(".hero-media video");
  var vbtn = document.querySelector(".video-toggle");
  if (video) {
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData);
    var setBtn = function () {
      if (!vbtn) return;
      var paused = video.paused;
      vbtn.setAttribute("aria-label", paused ? "Lire la vidéo" : "Mettre la vidéo en pause");
      vbtn.innerHTML = paused
        ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>'
        : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';
    };
    if (calm) { video.pause(); } else { var p = video.play(); if (p && p.catch) p.catch(function () { setBtn(); }); }
    video.addEventListener("play", setBtn);
    video.addEventListener("pause", setBtn);
    if (vbtn) vbtn.addEventListener("click", function () { if (video.paused) { video.play(); } else { video.pause(); } });
    setBtn();
  }

  /* Cartes de programmes */
  var PIN = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg>';
  function card(p) {
    var url = ROOT + p.url;
    return '<article class="program reveal">' +
      '<a href="' + url + '" class="program-visual" tabindex="-1" aria-hidden="true">' +
      '<picture><source type="image/webp" srcset="' + ROOT + p.visuel + '.webp"><img src="' + ROOT + p.visuel + '.jpg" alt="" loading="lazy" width="800" height="533"></picture>' +
      '<span class="badges"><span class="badge ' + esc(p.statut) + '">' + esc(STATUTS[p.statut] || p.statut) + '</span>' +
      (p.exemple ? '<span class="badge exemple">Exemple</span>' : "") + "</span>" +
      '<span class="visual-note">Illustration non contractuelle</span></a>' +
      '<div class="program-body"><h3><a href="' + url + '" style="color:inherit;text-decoration:none">' + esc(p.nom) + "</a></h3>" +
      '<p class="program-loc">' + PIN + esc(p.secteur) + "</p>" +
      '<ul class="program-meta"><li><span>Typologies</span>' + esc(p.typoLabel) + "</li><li><span>Livraison</span>" + esc(p.livraison) + "</li><li><span>Lots</span>" + esc(p.lots) + "</li></ul>" +
      '<div class="program-foot"><p class="price"><small>À partir de</small><strong>' + eur.format(p.prix) + "</strong></p>" +
      '<a class="link-arrow" href="' + url + '">Découvrir <span class="arrow" aria-hidden="true">→</span><span class="sr-only"> ' + esc(p.nom) + "</span></a></div></div></article>";
  }
  var PREVIEW = body.getAttribute("data-preview") !== "0";
  /* Hors version de présentation, les programmes « exemple » ne sont jamais affichés. */
  var PROGS = (window.TRIANGUL_PROGRAMMES || []).filter(function (p) { return p.statut !== "livre" && (PREVIEW || !p.exemple); });

  document.querySelectorAll("select[data-secteurs]").forEach(function (sel) {
    var seen = {};
    PROGS.forEach(function (p) {
      if (seen[p.secteur]) return;
      seen[p.secteur] = 1;
      var o = document.createElement("option");
      o.value = p.secteur; o.textContent = p.secteur;
      sel.appendChild(o);
    });
  });

  var home = document.querySelector('[data-programmes="accueil"]');
  if (home) { home.innerHTML = PROGS.slice(0, 3).map(card).join(""); observe(home); }

  var list = document.querySelector('[data-programmes="liste"]');
  var filtres = document.getElementById("filtres");
  if (list && filtres) {
    var count = document.getElementById("nb-resultats");
    var params = new URLSearchParams(location.search);
    ["secteur", "typo", "budget", "livraison", "tri"].forEach(function (k) {
      if (params.get(k) && filtres.elements[k]) filtres.elements[k].value = params.get(k);
    });
    var apply = function () {
      var f = filtres.elements;
      var s = f.secteur.value, t = f.typo.value, b = +f.budget.value || 0, l = +f.livraison.value || 0;
      var items = PROGS.filter(function (p) {
        return (!s || p.secteur === s) && (!t || p.typologies.indexOf(t) > -1) && (!b || p.prix <= b) && (!l || p.annee <= l);
      });
      var tri = f.tri ? f.tri.value : "";
      if (tri === "prix") items.sort(function (a, z) { return a.prix - z.prix; });
      if (tri === "prix-desc") items.sort(function (a, z) { return z.prix - a.prix; });
      if (tri === "livraison") items.sort(function (a, z) { return a.annee - z.annee; });
      list.innerHTML = items.length ? items.map(card).join("") :
        '<div class="empty" style="grid-column:1/-1"><h3>Aucun programme ne correspond à ces critères</h3><p>Élargissez votre recherche ou laissez-nous vos critères : nous vous prévenons dès qu\'un programme correspond.</p><a class="btn btn-sage" href="#alerte">Être prévenu en avant-première</a></div>';
      if (count) count.textContent = items.length + (items.length > 1 ? " programmes correspondent" : " programme correspond") + " à votre recherche";
      observe(list);
    };
    filtres.addEventListener("change", apply);
    filtres.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
    filtres.addEventListener("reset", function () { setTimeout(apply, 0); });
    apply();
  }

  var real = document.querySelector('[data-programmes="realisations"]');
  if (real && (window.TRIANGUL_REALISATIONS || []).length) {
    real.innerHTML = window.TRIANGUL_REALISATIONS.map(card).join("");
    var vide = document.getElementById("realisations-vide");
    if (vide) vide.hidden = true;
    observe(real);
  }

  /* Simulateur de mensualité */
  var sim = document.getElementById("simulateur");
  if (sim) {
    var out = sim.querySelector("[data-mensualite]");
    var det = sim.querySelector("[data-detail]");
    var calc = function () {
      var prix = +sim.elements.prix.value || 0, apport = +sim.elements.apport.value || 0;
      var ans = +sim.elements.duree.value || 25, taux = (+sim.elements.taux.value || 0) / 100;
      var frais = prix * 0.025, capital = Math.max(prix + frais - apport, 0);
      var n = ans * 12, r = taux / 12;
      var m = r ? capital * r / (1 - Math.pow(1 + r, -n)) : capital / n;
      out.textContent = eur.format(Math.round(m)) + " / mois";
      det.textContent = "Montant emprunté : " + eur.format(capital) + " · frais de notaire estimés (2,5 %) : " + eur.format(frais);
      var go = sim.querySelector("[data-sim-programmes]");
      if (go) {
        var paliers = [200000, 250000, 300000, 350000, 400000, 500000], pal = "";
        for (var i = 0; i < paliers.length; i++) { if (paliers[i] >= prix) { pal = paliers[i]; break; } }
        go.href = "programmes.html" + (pal ? "?budget=" + pal : "") + "#filtres";
        var fin = sim.querySelector("[data-sim-rappel]");
        if (fin) fin.href = "contact.html?objet=" + encodeURIComponent("Étudier mon financement") +
          "&message=" + encodeURIComponent("Projet d'achat d'environ " + eur.format(prix) + ", apport de " + eur.format(apport) + ", sur " + ans + " ans.") + "#rappel";
      }
    };
    sim.addEventListener("input", calc);
    sim.addEventListener("submit", function (e) { e.preventDefault(); calc(); });
    calc();
  }

  /* Préremplissage par l'adresse (?objet=…&typo=…&lot=…) et par les boutons [data-prefill-lot] */
  var qs = new URLSearchParams(location.search);
  function prefill(form, data) {
    Object.keys(data).forEach(function (k) {
      var el = form.elements[k];
      if (!el || !data[k]) return;
      if (el.tagName === "SELECT") {
        var ok = Array.prototype.some.call(el.options, function (o) { return (o.value || o.text) === data[k]; });
        if (!ok) { var o = document.createElement("option"); o.text = data[k]; el.add(o); }
      }
      el.value = data[k];
    });
  }
  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    var d = {};
    ["objet", "typo", "lot", "projet", "message"].forEach(function (k) { if (qs.get(k)) d[k] = qs.get(k); });
    prefill(form, d);
  });
  document.querySelectorAll("[data-prefill-lot]").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = document.querySelector(b.getAttribute("href") + " form");
      if (f) prefill(f, { lot: b.getAttribute("data-prefill-lot"), typo: b.getAttribute("data-typo") });
      track("clic_lot", { lot: b.getAttribute("data-prefill-lot") });
    });
  });

  /* Contact : #rdv propose un rendez-vous, #rappel un rappel */
  var rtype = document.querySelector('#rdv select[name="type"]');
  if (rtype && rtype.options[0].text === "Être rappelé") {
    var setType = function () { rtype.selectedIndex = location.hash === "#rdv" ? 1 : 0; };
    setType(); window.addEventListener("hashchange", setType);
  }

  /* Formulaires : envoi direct depuis le site (service défini par data-endpoint),
     repli sur la messagerie du visiteur si le service ne répond pas. */
  var ENDPOINT = body.getAttribute("data-endpoint") || "";
  function fields(form) {
    var data = {}, lines = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === "checkbox" || el.type === "submit" || el.name.charAt(0) === "_" || !el.value) return;
      var lab = form.querySelector('label[for="' + el.id + '"]');
      var key = lab ? lab.textContent.replace(/\s*\*\s*$/, "") : el.name;
      data[key] = el.value;
      lines.push(key + " : " + el.value);
    });
    return { data: data, lines: lines };
  }
  function viaMail(subject, lines) {
    window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n") + "\n");
  }
  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    var honey = document.createElement("input");
    honey.type = "text"; honey.name = "_honey"; honey.tabIndex = -1; honey.autocomplete = "off";
    honey.setAttribute("aria-hidden", "true"); honey.className = "hp";
    form.appendChild(honey);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var f = fields(form);
      var subject = form.getAttribute("data-mailto") + (form.elements.objet ? " – " + form.elements.objet.value : "");
      var st = form.querySelector(".form-status");
      var btn = form.querySelector('[type="submit"]');
      var kind = form.getAttribute("data-form") || "contact";
      var tel = body.getAttribute("data-tel");
      var done = function () {
        track("demande_envoyee", { formulaire: kind });
        var ok = document.createElement("div");
        ok.className = "form-success";
        ok.setAttribute("role", "status");
        ok.setAttribute("tabindex", "-1");
        ok.innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>' +
          "<h3>" + esc(form.getAttribute("data-merci") || "Merci, votre demande est bien envoyée.") + "</h3>" +
          "<p>Nous vous répondons personnellement sous 24 heures ouvrées" + (tel ? ', ou appelez-nous dès maintenant au <a href="tel:' + esc(tel.replace(/[^\d+]/g, "")) + '">' + esc(tel) + "</a>" : "") + ".</p>";
        form.replaceWith(ok);
        ok.focus();
      };
      if (!ENDPOINT) {
        viaMail(subject, f.lines);
        if (st) { st.textContent = "Votre messagerie s'ouvre avec votre demande déjà rédigée : il ne reste qu'à l'envoyer."; st.classList.add("show"); }
        return;
      }
      if (form.elements._honey && form.elements._honey.value) return;
      var payload = Object.assign({ _subject: subject, _template: "table", _captcha: "false", Page: location.href }, f.data);
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Envoi en cours…"; }
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json().catch(function () { return {}; }); })
        .then(function (j) { if (j && (j.success === false || j.success === "false")) throw new Error("refus"); done(); })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
          if (st) {
            st.innerHTML = 'L\'envoi n\'a pas abouti. <a href="#" data-mail>Envoyer par votre messagerie</a> ou écrivez-nous à ' + esc(EMAIL) + ".";
            st.classList.add("show");
            st.querySelector("[data-mail]").addEventListener("click", function (ev) { ev.preventDefault(); viaMail(subject, f.lines); });
          }
        });
    });
  });

  /* Diagnostic foncier express : données publiques IGN, cadastre, PLU et Géorisques */
  var diag = document.getElementById("diag-form");
  if (diag) {
    var res = document.getElementById("diag-out");
    var getJSON = function (url) {
      return fetch(url, { headers: { Accept: "application/json" } }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    };
    var ZONES = {
      U: "Zone urbaine : terrain en principe constructible, selon le règlement de la zone",
      AU: "Zone à urbaniser : ouverture à la construction prévue, souvent sous conditions",
      A: "Zone agricole : constructions très encadrées",
      N: "Zone naturelle : constructions très encadrées"
    };
    var shape = function (geom, pt) {
      if (!geom) return "";
      var polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
      var lat0 = pt[1], k = Math.cos(lat0 * Math.PI / 180);
      var pts = [], minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
      var proj = function (c) { var x = (c[0] - pt[0]) * k * 111320, y = -(c[1] - pt[1]) * 110540; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); return [x, y]; };
      polys.forEach(function (poly) { pts.push(poly[0].map(proj)); });
      var w = maxx - minx || 1, h = maxy - miny || 1, pad = Math.max(w, h) * 0.18;
      var vb = (minx - pad) + " " + (miny - pad) + " " + (w + 2 * pad) + " " + (h + 2 * pad);
      var sw = Math.max(w, h) / 120;
      var d = pts.map(function (ring) { return "M" + ring.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join("L") + "Z"; }).join("");
      return '<div class="diag-shape"><svg viewBox="' + vb + '" role="img" aria-label="Contour de la parcelle cadastrale">' +
        '<path d="' + d + '" fill="#F2E9D6" stroke="#8A6A2B" stroke-width="' + sw.toFixed(2) + '" stroke-linejoin="round"/>' +
        '<circle cx="0" cy="0" r="' + (sw * 3).toFixed(2) + '" fill="#2C3E35"/></svg></div>';
    };
    diag.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = diag.elements.adresse.value.trim();
      if (q.length < 6) { diag.elements.adresse.focus(); return; }
      res.hidden = false;
      res.innerHTML = '<div class="diag-loading"><span class="spinner" aria-hidden="true"></span>Interrogation du cadastre et du plan local d\'urbanisme…</div>';
      var adr, pt;
      getJSON("https://data.geopf.fr/geocodage/search?limit=1&q=" + encodeURIComponent(q)).then(function (g) {
        if (!g.features || !g.features.length) throw new Error("adresse");
        adr = g.features[0]; pt = adr.geometry.coordinates;
        var geom = encodeURIComponent(JSON.stringify({ type: "Point", coordinates: pt }));
        var insee = adr.properties.citycode;
        return Promise.all([
          getJSON("https://apicarto.ign.fr/api/cadastre/parcelle?geom=" + geom).catch(function () { return null; }),
          getJSON("https://apicarto.ign.fr/api/gpu/zone-urba?geom=" + geom).catch(function () { return null; }),
          insee ? getJSON("https://georisques.gouv.fr/api/v1/gaspar/risques?code_insee=" + insee).catch(function () { return null; }) : null
        ]);
      }).then(function (r) {
        var parc = r[0] && r[0].features && r[0].features[0];
        var zone = r[1] && r[1].features && r[1].features[0];
        var risques = [];
        if (r[2] && r[2].data) r[2].data.forEach(function (c) { (c.risques_detail || []).forEach(function (d) { if (risques.indexOf(d.libelle_risque_long) < 0) risques.push(d.libelle_risque_long); }); });
        var surf = parc ? parc.properties.contenance : null;
        var tz = zone ? zone.properties.typezone : null;
        var verdict, cls = "";
        if (!zone) { verdict = "Règles d'urbanisme à vérifier"; }
        else if (tz === "U" && surf >= 800) { verdict = "Potentiel à étudier en priorité"; cls = "fort"; }
        else if (tz === "U" && surf >= 300) { verdict = "Potentiel à confirmer"; }
        else if (tz === "U") { verdict = "Petite parcelle : à étudier avec les voisins"; }
        else if (tz && tz.indexOf("AU") === 0) { verdict = "Potentiel à moyen terme"; }
        else { verdict = "Constructibilité limitée"; cls = "faible"; }
        var p = adr.properties;
        var ref = parc ? parc.properties.section + " " + parc.properties.numero : "Non trouvée";
        var gpu = "https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon=" + pt[0] + "&lat=" + pt[1] + "&zoom=18";
        res.innerHTML =
          '<div class="diag-head"><h3>' + esc(p.label) + '</h3><span class="diag-verdict ' + cls + '">' + esc(verdict) + "</span></div>" +
          shape(parc && parc.geometry, pt) +
          '<dl class="diag-rows">' +
          "<div><dt>Parcelle cadastrale</dt><dd>" + esc(ref) + (parc ? " – " + esc(parc.properties.nom_com) : "") + "</dd></div>" +
          "<div><dt>Surface cadastrale</dt><dd>" + (surf ? num.format(surf) + " m²" : "Non disponible") + "</dd></div>" +
          "<div><dt>Zone du PLU</dt><dd>" + (zone ? esc(zone.properties.libelong || zone.properties.libelle) + "<br><small>" + esc(ZONES[tz && tz.indexOf("AU") === 0 ? "AU" : tz] || "") + "</small>" : "Non publiée sur le Géoportail de l'urbanisme (commune au RNU ou document en cours)") + "</dd></div>" +
          "<div><dt>Risques recensés</dt><dd>" + (risques.length ? esc(risques.slice(0, 5).join(" · ")) : "Aucun risque majeur recensé pour la commune") + "</dd></div>" +
          "</dl>" +
          '<div class="btn-row"><a class="btn btn-sage" href="#etude" data-prefill>Recevoir l\'étude complète gratuite</a><a class="btn btn-line" href="' + gpu + '" target="_blank" rel="noopener">Voir le règlement du PLU</a></div>' +
          '<p class="diag-note">Pré-diagnostic automatique et indicatif, établi à partir des données publiques de l\'IGN (Géoplateforme, cadastre, Géoportail de l\'urbanisme) et de Géorisques. Il ne remplace pas l\'étude de faisabilité réalisée par nos équipes.</p>';
        var pre = res.querySelector("[data-prefill]");
        pre.addEventListener("click", function () {
          var set = function (id, v) { var el = document.getElementById(id); if (el && v) el.value = v; };
          set("t-adresse", p.label);
          set("t-cadastre", parc ? parc.properties.idu : "");
          set("t-surface", surf ? surf + " m²" : "");
        });
      }).catch(function () {
        res.innerHTML = "<p><strong>Adresse introuvable.</strong> Vérifiez l'orthographe (numéro, rue, code postal, commune) ou décrivez votre bien dans le formulaire ci-dessous : nous faisons la recherche pour vous.</p>";
      });
    });
  }
})();
