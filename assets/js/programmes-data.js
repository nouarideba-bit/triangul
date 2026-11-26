/* Programmes affichés sur le site.
   Pour publier un vrai programme : copier un bloc, mettre exemple: false
   et renseigner ses informations. Les blocs exemple: true sont des
   exemples de présentation : les retirer avant la mise en ligne définitive.
   statut : "lancement" | "dernieres" | "travaux" | "livre" */
window.TRIANGUL_PROGRAMMES = [
  {
    id: "jardins-armance",
    exemple: true,
    nom: "Les Jardins d'Armance",
    secteur: "Essonne (91)",
    statut: "lancement",
    typologies: ["T1", "T2", "T3", "T4"],
    typoLabel: "Du T1 au T4",
    lots: 32,
    livraison: "4e trimestre 2028",
    annee: 2028,
    prix: 219000,
    visuel: "assets/img/photos/programme-jardins-armance-800",
    atouts: ["RE2020", "Jardins privatifs", "Parking en sous-sol"],
    url: "programme-exemple.html"
  },
  {
    id: "clos-tanneurs",
    exemple: true,
    nom: "Le Clos des Tanneurs",
    secteur: "Val-d'Oise (95)",
    statut: "dernieres",
    typologies: ["T2", "T3", "T4", "T5"],
    typoLabel: "Du T2 au T5",
    lots: 24,
    livraison: "2e trimestre 2027",
    annee: 2027,
    prix: 265000,
    visuel: "assets/img/photos/programme-clos-tanneurs-800",
    atouts: ["Cœur de ville", "Balcons", "Façades en brique"],
    url: "programme-exemple.html"
  },
  {
    id: "villa-lumen",
    exemple: true,
    nom: "Villa Lumen",
    secteur: "Hauts-de-Seine (92)",
    statut: "travaux",
    typologies: ["Studio", "T2", "T3"],
    typoLabel: "Du studio au T3",
    lots: 41,
    livraison: "1er trimestre 2027",
    annee: 2027,
    prix: 289000,
    visuel: "assets/img/photos/programme-villa-lumen-800",
    atouts: ["Commerces en pied d'immeuble", "Proche transports"],
    url: "programme-exemple.html"
  }
];

/* Réalisations livrées (vide pour l'instant). */
window.TRIANGUL_REALISATIONS = [];
