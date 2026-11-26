# TRIANGUL – site internet triangul.fr

Site de TRIANGUL SAS, promoteur immobilier. Slogan : **« Bâtir sur des bases solides. »**

Site statique (HTML, CSS, JavaScript sans framework) publié avec GitHub Pages.
Aperçu : https://nouarideba-bit.github.io/triangul/

## Contenu

| Page | Fichier |
|---|---|
| Accueil (vidéo, recherche, engagements, chiffres clés) | `index.html` |
| Programmes (filtres, simulateur, alertes) | `programmes.html` |
| Fiche programme (exemple) | `programme-exemple.html` |
| Réalisations | `realisations.html` |
| Savoir-faire, collectivités et bailleurs | `savoir-faire.html` |
| Vendre votre terrain + diagnostic foncier express | `vendre-votre-terrain.html` |
| Conseils et actualités (3 guides) | `actualites.html`, `actualites/` |
| Contact, mentions légales | `contact.html`, `mentions-legales.html` |
| Espace partenaires (connexion sécurisée) | `espace-partenaires/` |

## Modifier le site

Les pages sont générées à partir des sources de `_src/pages/` :

```bash
python3 _src/build.py                                   # régénère toutes les pages
TRIANGUL_CONTACT=autre@triangul.fr python3 _src/build.py # change l'adresse de contact
```

- **Programmes** : modifier `assets/js/programmes-data.js` (un bloc par programme ; `exemple: true` affiche le badge « Exemple »).
- **Bandeau « version de présentation »** : `CONFIG["preview"]` dans `_src/build.py`.
- **Logo** : `assets/img/logo-triangul.svg` (complet), `logo-mark.svg` (pictogramme), `favicon.svg`.

Visuels : images de synthèse générées pour le site ; vidéo d'accueil montée à partir de ces images.
Polices Cormorant Garamond et Inter (licence SIL OFL), hébergées sur le site.

## Diagnostic foncier express

Sur `vendre-votre-terrain.html#diagnostic` : à partir d'une adresse, le navigateur interroge directement
les services publics (Géoplateforme IGN pour l'adresse, API Carto pour le cadastre et le PLU, Géorisques).
Aucune donnée n'est stockée par TRIANGUL.

## Espace partenaires (Supabase)

Projet Supabase `triangul` (région Paris). Les partenaires ont un accès en lecture seule à leurs opérations.

Pour ouvrir un accès (tableau de bord Supabase) :

1. Table `acces_autorises` : ajouter l'adresse e-mail (en minuscules), le nom et la société.
2. Authentication > Users > Add user : créer l'utilisateur avec cette adresse et un mot de passe (cocher « Auto Confirm User »).
3. Table `operations` : créer l'opération ; table `operation_membres` : rattacher l'adresse à l'opération.
4. Storage > `documents-partenaires` : déposer les fichiers dans un dossier nommé avec l'`id` de l'opération,
   puis les déclarer dans la table `documents` (`chemin` = `<id de l'opération>/<nom du fichier>`).
5. Table `actualites_operation` : publier les étapes d'avancement.

Une adresse absente de `acces_autorises` ne peut pas créer de compte.
Pour que « Mot de passe oublié » fonctionne : Authentication > URL Configuration, renseigner l'adresse du site
comme Site URL et ajouter `…/espace-partenaires/nouveau-mot-de-passe.html` aux Redirect URLs.

## Domaine triangul.fr

Une fois le site validé : ajouter le domaine dans Settings > Pages du dépôt, puis chez OVH faire pointer
`triangul.fr` (enregistrements A vers GitHub Pages) et `www` (CNAME vers `nouarideba-bit.github.io`).
Les enregistrements e-mail (MX, SPF, DKIM, DMARC) ne sont pas concernés.
