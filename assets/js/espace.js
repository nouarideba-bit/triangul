/* TRIANGUL — espace partenaires (authentification Supabase).
   La clé ci-dessous est la clé publique du projet : elle est faite pour être
   visible. La sécurité repose sur les règles d'accès de la base (RLS) :
   chaque partenaire ne lit que les opérations auxquelles il est rattaché. */
(function () {
  "use strict";
  var SUPABASE_URL = "https://iwgjeemxvrejjgbqaxrn.supabase.co";
  var SUPABASE_KEY = "sb_publishable_Z8NpCBnSq9REU5XBqnjQLQ_zVcRQDnX";
  var BUCKET = "documents-partenaires";
  if (!window.supabase) return;

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  var page = document.body.getAttribute("data-espace");
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var say = function (el, text, kind) { el.textContent = text; el.className = "alert " + kind; el.hidden = false; };
  var ERREURS = {
    "Invalid login credentials": "Identifiant ou mot de passe incorrect.",
    "Email not confirmed": "Votre adresse n'est pas encore confirmée : utilisez le lien reçu par e-mail."
  };
  var fr = function (err) { return ERREURS[err && err.message] || "Une erreur est survenue. Merci de réessayer dans un instant."; };
  var dateFr = function (d) {
    var x = new Date(String(d).slice(0, 10) + "T00:00:00");
    return isNaN(x) ? "" : x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  if (page === "connexion") {
    sb.auth.getSession().then(function (r) { if (r.data && r.data.session) location.replace("tableau-de-bord.html"); });
    var form = $("#login"), alertBox = $("#login-alert"), btn = form.querySelector("button[type=submit]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alertBox.hidden = true;
      btn.disabled = true; btn.textContent = "Connexion…";
      sb.auth.signInWithPassword({ email: form.elements.email.value.trim().toLowerCase(), password: form.elements.password.value })
        .then(function (r) {
          if (r.error) { say(alertBox, fr(r.error), "error"); btn.disabled = false; btn.textContent = "Se connecter"; }
          else { location.href = "tableau-de-bord.html"; }
        });
    });
    $("#forgot").addEventListener("click", function () {
      var email = form.elements.email.value.trim().toLowerCase();
      if (!email) { say(alertBox, "Saisissez d'abord votre identifiant (votre adresse e-mail).", "error"); form.elements.email.focus(); return; }
      sb.auth.resetPasswordForEmail(email, { redirectTo: new URL("nouveau-mot-de-passe.html", location.href).href })
        .then(function () { say(alertBox, "Si cette adresse dispose d'un accès, un lien pour choisir un nouveau mot de passe vient de lui être envoyé.", "ok"); });
    });
  }

  if (page === "mot-de-passe") {
    var f = $("#newpass"), a = $("#pass-alert");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (f.elements.p1.value !== f.elements.p2.value) { say(a, "Les deux mots de passe ne correspondent pas.", "error"); return; }
      sb.auth.updateUser({ password: f.elements.p1.value }).then(function (r) {
        if (r.error) { say(a, "Ce lien a expiré ou n'est plus valable : redemandez-en un depuis la page de connexion.", "error"); }
        else { say(a, "Mot de passe enregistré. Ouverture de votre espace…", "ok"); setTimeout(function () { location.href = "tableau-de-bord.html"; }, 1200); }
      });
    });
  }

  if (page === "tableau") {
    var zone = $("#operations");
    $("#logout").addEventListener("click", function () { sb.auth.signOut().then(function () { location.replace("index.html"); }); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-doc]") : null;
      if (!b) return;
      b.disabled = true; b.textContent = "Préparation…";
      sb.storage.from(BUCKET).createSignedUrl(b.getAttribute("data-doc"), 120, { download: true }).then(function (r) {
        b.disabled = false; b.textContent = "Télécharger";
        if (r.error || !r.data) { alert("Document indisponible pour le moment."); return; }
        window.location.href = r.data.signedUrl;
      });
    });
    sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (!s) { location.replace("index.html"); return; }
      $("#user-email").textContent = s.user.email;
      return Promise.all([
        sb.from("acces_autorises").select("nom,societe").maybeSingle(),
        sb.from("operations").select("id,nom,localisation,statut,description").order("created_at"),
        sb.from("documents").select("id,operation_id,titre,categorie,chemin,created_at").order("created_at", { ascending: false }),
        sb.from("actualites_operation").select("id,operation_id,titre,contenu,publie_le").order("publie_le", { ascending: false })
      ]).then(function (res) {
        var acc = res[0].data, ops = res[1].data || [], docs = res[2].data || [], news = res[3].data || [];
        if (acc && acc.nom) $("#user-name").textContent = acc.nom;
        if (!ops.length) {
          zone.innerHTML = '<div class="empty"><h3>Aucune opération partagée pour le moment</h3><p>Dès que TRIANGUL vous rattache à une opération, ses documents et son avancement apparaissent ici.</p></div>';
          return;
        }
        zone.innerHTML = ops.map(function (op) {
          var d = docs.filter(function (x) { return x.operation_id === op.id; });
          var n = news.filter(function (x) { return x.operation_id === op.id; });
          return '<article class="op"><div class="op-head"><div><h2>' + esc(op.nom) + '</h2><p class="program-loc">' + esc(op.localisation || "") + '</p></div>' +
            '<span class="badge travaux">' + esc(op.statut) + "</span></div>" +
            (op.description ? "<p>" + esc(op.description) + "</p>" : "") +
            '<div class="op-grid"><section><h3>Documents</h3>' +
            (d.length ? '<ul class="doc-list">' + d.map(function (x) {
              return "<li><span>" + esc(x.titre) + "<small>" + esc(x.categorie) + " · " + dateFr(x.created_at) + '</small></span><button type="button" data-doc="' + esc(x.chemin) + '">Télécharger</button></li>';
            }).join("") + "</ul>" : '<p class="program-loc">Aucun document pour l\'instant.</p>') +
            "</section><section><h3>Avancement</h3>" +
            (n.length ? '<ol class="timeline">' + n.map(function (x) {
              return "<li><time>" + dateFr(x.publie_le) + "</time><strong>" + esc(x.titre) + "</strong>" + (x.contenu ? "<p>" + esc(x.contenu) + "</p>" : "") + "</li>";
            }).join("") + "</ol>" : '<p class="program-loc">Aucune actualité pour l\'instant.</p>') +
            "</section></div></article>";
        }).join("");
      });
    }).catch(function () {
      zone.innerHTML = '<div class="alert error">Impossible de charger votre espace pour le moment. Merci de réessayer.</div>';
    });
  }
})();
