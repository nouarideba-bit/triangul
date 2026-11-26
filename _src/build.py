"""Générateur du site TRIANGUL.

Usage : python3 _src/build.py
Lit les pages sources de _src/pages/*.html (plusieurs pages par fichier,
chacune précédée d'un en-tête <!--PAGE {...}-->) et écrit les pages finales
à la racine du dépôt, avec l'en-tête, le pied de page, le plan du site et
robots.txt. Le dossier _src n'est pas publié par GitHub Pages.

L'adresse de contact affichée sur le site se règle avec la variable
d'environnement TRIANGUL_CONTACT (obligatoire).
"""
import datetime
import html
import json
import os
import re
from pathlib import Path

SRC = Path(__file__).resolve().parent
SITE = SRC.parent

CONFIG = {
    "contact": os.environ.get("TRIANGUL_CONTACT", ""),  # obligatoire : adresse de contact du site
    "base_url": "https://triangul.fr/",      # adresse définitive du site
    "preview": True,                         # bandeau « version de présentation » ; False masque aussi les programmes « exemple »
    # Téléphone commercial affiché partout (lien cliquable). Vide = aucun numéro affiché.
    "tel": os.environ.get("TRIANGUL_TEL", "06 66 58 20 03"),
    # Service qui reçoit les formulaires et les transmet par e-mail (envoi direct depuis le site).
    # "formsubmit" (gratuit, sans compte) : le premier envoi déclenche un e-mail d'activation
    # à l'adresse de contact. Vide = ancien fonctionnement par la messagerie du visiteur.
    "form_endpoint": os.environ.get("TRIANGUL_FORM_ENDPOINT", "formsubmit"),
    # Mesure d'audience sans cookie (Plausible) : domaine déclaré chez Plausible. Vide = désactivée.
    "plausible": os.environ.get("TRIANGUL_PLAUSIBLE", ""),
}

NAV = [
    ("programmes.html", "Programmes", "programmes"),
    ("savoir-faire.html", "Qui sommes-nous", "savoir-faire"),
    ("realisations.html", "Réalisations", "realisations"),
    ("vendre-votre-terrain.html", "Vendre votre terrain", "terrain"),
    ("actualites.html", "Conseils", "actualites"),
]


def tel_href():
    t = re.sub(r"[^\d+]", "", CONFIG["tel"])
    if t.startswith("0"):
        t = "+33" + t[1:]
    return "tel:" + t


def form_endpoint():
    e = CONFIG["form_endpoint"]
    if e == "formsubmit":
        return "https://formsubmit.co/ajax/" + CONFIG["contact"]
    return e


PHONE_SVG = ('<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" '
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>')


def mobile_cta(meta, root):
    """Barre d'actions fixe en bas d'écran sur mobile, adaptée à la page."""
    if meta.get("espace") or meta.get("no_cta"):
        return ""
    items = []
    if meta.get("cta") == "programme":
        items.append('<a href="#brochure" data-track="cta_brochure">Brochure</a>')
        items.append('<a href="#rdv" data-track="cta_rdv">Rendez-vous</a>')
    elif meta.get("nav") == "terrain":
        items.append('<a href="#etude" data-track="cta_etude">Étude gratuite</a>')
    else:
        items.append(f'<a href="{root}programmes.html">Programmes</a>')
        items.append(f'<a href="{root}contact.html#rdv" data-track="cta_rdv">Rendez-vous</a>')
    if CONFIG["tel"]:
        items.append(f'<a class="main" href="{tel_href()}" data-track="clic_telephone">{PHONE_SVG}Appeler</a>')
    else:
        items.append(f'<a class="main" href="{root}contact.html#rappel" data-track="cta_rappel">{PHONE_SVG}Être rappelé</a>')
    return f'<nav class="mobile-cta" aria-label="Actions rapides">{"".join(items)}</nav>'

PREVIEW_BAR = ('<div class="preview-bar"><strong>Version de présentation.</strong> '
               'Les programmes affichés sont des exemples fictifs et les visuels des images de synthèse non contractuelles.</div>')


def header(meta, root):
    links = []
    for href, label, key in NAV:
        cur = ' aria-current="page"' if meta.get("nav") == key else ""
        links.append(f'<a href="{root}{href}"{cur}>{label}</a>')
    if CONFIG["tel"]:
        links.append(f'<a class="nav-tel" href="{tel_href()}" data-track="clic_telephone">{PHONE_SVG}{html.escape(CONFIG["tel"])}</a>')
    links.append(f'<a class="btn btn-sage" href="{root}contact.html#rdv" data-track="cta_rdv">Prendre rendez-vous</a>')
    bar = PREVIEW_BAR if CONFIG["preview"] else ""
    return f"""<a class="skip" href="#contenu">Aller au contenu</a>
<header class="site-header">
  {bar}
  <div class="wrap header-in">
    <a class="brand" href="{root}index.html" aria-label="TRIANGUL, retour à l'accueil">
      <img class="mark-dark" src="{root}assets/img/logo-mark.svg" alt="" width="42" height="37">
      <img class="mark-light" src="{root}assets/img/logo-mark-light.svg" alt="" width="42" height="37">
      <span class="brand-name"><strong>TRIANGUL</strong><small>Promoteur immobilier</small></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button>
    <nav id="nav" class="nav" aria-label="Navigation principale">
      {"".join(links)}
    </nav>
  </div>
</header>"""


def footer(root):
    c = CONFIG["contact"]
    return f"""<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="{root}index.html" aria-label="TRIANGUL, retour à l'accueil">
          <img src="{root}assets/img/logo-mark-light.svg" alt="" width="42" height="37">
          <span class="brand-name"><strong>TRIANGUL</strong><small>Promoteur immobilier</small></span>
        </a>
        <p class="footer-slogan">Bâtir sur des bases solides.</p>
        <p>Logements neufs, programmes mixtes et projets de cœur de ville, en Île-de-France et dans le Bassin parisien.</p>
      </div>
      <div>
        <h3>Acheter</h3>
        <ul>
          <li><a href="{root}programmes.html">Nos programmes</a></li>
          <li><a href="{root}realisations.html">Nos réalisations</a></li>
          <li><a href="{root}savoir-faire.html">Notre savoir-faire</a></li>
          <li><a href="{root}actualites.html">Conseils et actualités</a></li>
        </ul>
      </div>
      <div>
        <h3>Propriétaires et partenaires</h3>
        <ul>
          <li><a href="{root}vendre-votre-terrain.html">Vendre votre terrain</a></li>
          <li><a href="{root}vendre-votre-terrain.html#diagnostic">Diagnostic foncier express</a></li>
          <li><a href="{root}savoir-faire.html#collectivites">Collectivités et bailleurs</a></li>
          <li><a href="{root}espace-partenaires/index.html">Espace partenaires</a></li>
        </ul>
      </div>
      <div>
        <h3>Contact</h3>
        <ul>
          <li>TRIANGUL SAS</li>
          <li>51, rue de Ponthieu<br>75008 Paris</li>
          {f'<li><a href="{tel_href()}" data-track="clic_telephone">{html.escape(CONFIG["tel"])}</a></li>' if CONFIG["tel"] else ""}
          <li><a href="mailto:{c}">{c}</a></li>
          <li><a href="{root}contact.html#rappel">Être rappelé</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span data-year>{datetime.date.today().year}</span> TRIANGUL SAS · RCS Paris 942 441 262</span>
      <span><a href="{root}mentions-legales.html">Mentions légales et confidentialité</a> · Visuels : images de synthèse non contractuelles</span>
    </div>
  </div>
</footer>"""


def org_ld():
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "TRIANGUL",
        "legalName": "TRIANGUL SAS",
        "url": CONFIG["base_url"],
        "logo": CONFIG["base_url"] + "assets/img/logo-triangul.svg",
        "slogan": "Bâtir sur des bases solides.",
        "address": {"@type": "PostalAddress", "streetAddress": "51, rue de Ponthieu", "postalCode": "75008",
                    "addressLocality": "Paris", "addressCountry": "FR"},
        "email": CONFIG["contact"],
        **({"telephone": tel_href()[4:]} if CONFIG["tel"] else {}),
    }


def render(meta, body):
    out = meta["out"]
    # 404 : chemins absolus, car la page peut être servie à n'importe quelle profondeur
    root = meta.get("abs_root") or "../" * out.count("/")
    body = (body.replace("{{root}}", root).replace("{{contact}}", CONFIG["contact"])
                .replace("{{year}}", str(datetime.date.today().year))
                .replace("{{tel}}", html.escape(CONFIG["tel"])).replace("{{tel_href}}", tel_href()))
    title = meta["title"] if meta.get("title_full") else f'{meta["title"]} | TRIANGUL, promoteur immobilier'
    canon = CONFIG["base_url"] + ("" if out == "index.html" else out)
    robots = '<meta name="robots" content="noindex, nofollow">' if meta.get("noindex") else ""
    ld = (f'<script type="application/ld+json">{json.dumps(org_ld(), ensure_ascii=False)}</script>'
          if out == "index.html" else "")
    scripts = [f'<script src="{root}assets/js/programmes-data.js"></script>', f'<script src="{root}assets/js/main.js"></script>']
    if meta.get("espace"):
        scripts += [f'<script src="{root}assets/js/vendor/supabase.js"></script>', f'<script src="{root}assets/js/espace.js"></script>']
    attrs = (f'class="{meta.get("body_class", "")}" data-root="{root}" data-contact="{CONFIG["contact"]}"'
             f' data-endpoint="{html.escape(form_endpoint())}" data-preview="{"1" if CONFIG["preview"] else "0"}"'
             f' data-tel="{html.escape(CONFIG["tel"])}"')
    if meta.get("espace"):
        attrs += f' data-espace="{meta["espace"]}"'
    desc = html.escape(meta["description"], quote=True)
    analytics = ""
    if CONFIG["plausible"] and not meta.get("noindex"):
        analytics = (f'<script defer data-domain="{html.escape(CONFIG["plausible"])}" src="https://plausible.io/js/script.tagged-events.js"></script>\n'
                     '<script>window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}</script>')
    og_img = CONFIG["base_url"] + meta.get("image", "assets/img/photos/hero.jpg")
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="description" content="{desc}">
{robots}
<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#2C3E35">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="TRIANGUL">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{og_img}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{root}assets/fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{root}assets/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/css/style.css">
{ld}
{analytics}
</head>
<body {attrs}>
{header(meta, root)}
<main id="contenu">
{body.strip()}
</main>
{footer(root)}
{mobile_cta(meta, root)}
{chr(10).join(scripts)}
</body>
</html>
"""


def main():
    if not CONFIG["contact"]:
        raise SystemExit("Indiquez l'adresse de contact : TRIANGUL_CONTACT=adresse@triangul.fr python3 _src/build.py")
    pages = []
    for f in sorted((SRC / "pages").glob("*.html")):
        text = f.read_text(encoding="utf-8")
        for m in re.finditer(r"<!--PAGE (\{.*?\})-->(.*?)(?=<!--PAGE |\Z)", text, re.S):
            pages.append((json.loads(m.group(1)), m.group(2)))
    for meta, body in pages:
        dest = SITE / meta["out"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(render(meta, body), encoding="utf-8")
    today = datetime.date.today().isoformat()
    urls = [CONFIG["base_url"] + ("" if m["out"] == "index.html" else m["out"]) for m, _ in pages if not m.get("noindex")]
    (SITE / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls) + "</urlset>\n",
        encoding="utf-8")
    (SITE / "robots.txt").write_text(
        f"User-agent: *\nDisallow: /espace-partenaires/\nSitemap: {CONFIG['base_url']}sitemap.xml\n", encoding="utf-8")
    print(f"{len(pages)} pages générées")


if __name__ == "__main__":
    main()
