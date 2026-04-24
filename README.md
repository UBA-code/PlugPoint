# ⚡ Charge.ma — Prototype de Navigation EV au Maroc

**Charge.ma** est un prototype fonctionnel conçu pour aider les conducteurs de véhicules électriques au Maroc à planifier leurs trajets en trouvant les bornes de recharge disponibles le long de leur itinéraire.

Ce projet a été réalisé dans le cadre d'un test technique, en utilisant exclusivement des outils open-source et des APIs gratuites.

---

## 🚀 Fonctionnalités Principales

### 1. Carte Interactive & Données en Temps Réel
- **Sourcing Dynamique** : Intégration de l'API **OpenChargeMap** pour récupérer les bornes de recharge au Maroc.
- **Visualisation Premium** : Utilisation de **Leaflet.js** avec des tuiles haute performance (CartoDB Positron) et regroupement par clusters.
- **Statut Visuel** : Distinction immédiate entre bornes opérationnelles (vert), en panne (rouge) et inconnues (indigo).
- **Fiches Détail** : Informations complètes au clic (opérateur, puissance en kW, types de connecteurs).

### 2. Planification de Trajet & Filtrage Corridor
- **Calcul d'Itinéraire** : Utilisation du serveur démo **OSRM** pour tracer la route entre deux points.
- **Filtrage de Précision (5km)** : Grâce à **Turf.js**, l'application calcule un "buffer" géographique autour du tracé. Seules les bornes situées à moins de 5 km du trajet sont affichées, garantissant une navigation sans détours inutiles.

### 3. Mode Conduite (UX Conducteur)
- **Interface Haute Performance** : Design sombre à fort contraste (OLED-friendly) avec de larges zones tactiles.
- **Métriques Avancées** :
    - Calcul de la **distance réelle le long du trajet** (pas à vol d'oiseau) pour chaque borne.
    - Estimation du temps d'arrivée (ETA).
    - Tri automatique des bornes par ordre d'apparition sur l'itinéraire.

### 4. Signalement Communautaire
- **Signalement en 1-clic** : Possibilité de signaler une borne comme "en panne" ou "fonctionnelle".
- **Persistance Locale** : Les signalements sont sauvegardés dans le `localStorage` du navigateur.
- **Intelligence Collective** : Le statut visuel de la borne change si les rapports de la communauté indiquent une panne (même si l'API source dit le contraire).

### 5. Internationalisation (i18n)
- Support complet du **Français**, **Anglais** et **Arabe**.
- Gestion native du mode **RTL** (Right-To-Left) pour l'interface en Arabe.

---

## 🛠️ Stack Technique

- **Moteur de Carte** : Leaflet.js
- **Analyse Géographique** : Turf.js
- **Routage** : Project OSRM (Open Source Routing Machine)
- **Autocomplete/Géocodage** : Nominatim (OpenStreetMap)
- **Data Source** : OpenChargeMap API
- **Design** : CSS3 Vanilla (Modern tokens & Glassmorphism)

---

## 📦 Installation et Lancement

Le projet est entièrement "Client-Side". Aucun serveur backend ou base de données externe n'est requis pour le test.

1.  **Cloner le dépôt** :
    ```bash
    git clone https://github.com/UBA-code/charge.ma
    ```
2.  **Lancer l'application** :
    - Ouvrez simplement le fichier `index.html` dans votre navigateur.
    - *Recommandé* : Utilisez une extension type "Live Server" (VS Code) pour une expérience optimale.

---

## 🧠 Décisions Techniques

- **Turf.js pour le Corridor** : Le filtrage géographique est l'aspect le plus critique. Turf.js a été choisi pour sa fiabilité dans les calculs de `booleanPointInPolygon` et `nearestPointOnLine`, permettant de garantir que les bornes proposées sont réellement sur la route du conducteur.
- **LocalStorage** : Pour un prototype, le `localStorage` offre une persistance immédiate sans la latence ou la complexité d'un backend, tout en permettant de tester les scénarios de signalement.
- **Clustering** : Étant donné le nombre croissant de bornes au Maroc (plus de 100 POIs), le clustering assure une fluidité maximale lors de l'exploration de la carte.

---

*Développé pour le test technique Charge.ma.*
