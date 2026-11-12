# AIster V1

Prototype web français d'assistant IA multi-modèles.

## Prérequis
- Node.js 18 ou plus récent
- Une clé API OpenRouter (les appels aux modèles peuvent être payants selon le modèle choisi)

## Installation
1. Décompresse le dossier.
2. Ouvre un terminal dans le dossier `aister-v1`.
3. Lance `npm install`.
4. Copie `.env.example` vers `.env`.
5. Crée une clé sur https://openrouter.ai/keys puis colle-la dans `OPENROUTER_API_KEY` dans `.env`.
6. Lance `npm start`.
7. Ouvre http://localhost:3000 dans ton navigateur.

## Fonctionnement
- Le navigateur communique uniquement avec le serveur AIster.
- La clé API reste côté serveur dans `.env` : ne la mets jamais dans `public/index.html` et ne la partage pas.
- Le mode Auto choisit un modèle selon le type de demande.
- Le mode multi-IA lance deux modèles en parallèle puis un troisième modèle synthétise leurs réponses. Il consomme donc davantage de crédits.
- Les modèles sont configurables dans `.env`.

## Déploiement
Pour publier le site, déploie le serveur Node.js sur un hébergeur compatible (par exemple Render, Railway ou un VPS), puis configure les variables d'environnement dans son tableau de bord. Un hébergement statique seul ne suffit pas, car la clé doit rester secrète côté serveur.

## Limites de cette V1
Cette version fournit un chat connecté à un fournisseur multi-modèles. Elle ne dispose pas encore de navigation web autonome, d'exécution sécurisée de code, de comptes utilisateurs, de base de données, de génération de fichiers ni de mémoire persistante côté serveur. Ces modules peuvent être ajoutés ensuite.
