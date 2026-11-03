# AI Coach

Application mobile Expo (iOS, Android et web) pour un coach IA. Le dépôt part du template Expo Router par défaut, mis à jour pour **Expo SDK 58**, avec NativeWind et une configuration publique Supabase.

## Environnement vérifié

| Outil | Version relevée | Exigence |
| --- | --- | --- |
| Node.js | 22.14.0 | 22.13 ou plus sur la branche 22 |
| npm | 11.6.1 | — |
| Expo CLI | 58.1.18 | livré avec le SDK |
| Expo SDK | 58.0.22 | Expo Go du store = SDK 58 |
| Expo Router | 58.0.29 | routes dans `src/app/` |
| React | 19.3.0 | version imposée par le SDK |
| React Native | 0.88.1 | version imposée par le SDK |
| TypeScript | 6.0.3 | — |
| NativeWind | 4.2.7 | Tailwind dans les composants |

Expo Go installé depuis le store ne charge que le SDK 58. Un projet SDK 57 est refusé. Il n’y a pas de dossiers `ios/` ni `android/` : les projets natifs sont générés au build (Continuous Native Generation).

## Template Expo

Le projet vient de `create-expo-app` (template par défaut), pas d’un template métier.

- Navigation par fichiers avec Expo Router, racine `src/app/`.
- Deux onglets de démo : Accueil (`src/app/index.tsx`) et Explore (`src/app/explore.tsx`).
- Onglets natifs sur mobile, onglets web dans `src/components/app-tabs.web.tsx`.
- Compilateur React et routes typées activés dans `app.json`.
- Schéma de lien : `aicoach`.
- NativeWind branché dans `babel.config.js`, `metro.config.js` et `src/global.css`.
- Les variables publiques passent par `src/lib/env.ts` (Zod). Le client Supabase n’est pas encore installé.

`npm run reset-project` déplace encore cet écran de démo. Ne le lance pas une fois les écrans du coach en place.

## Structure des dossiers

État actuel, à conserver :

```text
assets/                 icônes, splash, images
src/app/                écrans et layouts (une fichier = une route)
src/components/         UI partagée du template
src/constants/          thème
src/hooks/              thème et color scheme
src/lib/                validation d’environnement
scripts/                reset du template
```

Les écrans restent dans `src/app/`. Le reste du code reste en dehors, importé avec l’alias `@/`.

Dossiers à ajouter quand la fonctionnalité existe, sans déplacer le template maintenant :

```text
src/features/coach/     conversation, séance, messages
src/features/profile/   préférences du coaché
src/lib/supabase.ts     client Supabase
src/lib/api/            appels réseau hors Supabase
```

## Démarrage

```bash
npm install
copy .env.example .env
npx expo start
```

Renseigne `.env`, puis relance Expo : les variables `EXPO_PUBLIC_*` sont figées au démarrage de Metro. Ouvre le projet dans Expo Go (SDK 58) sur le même Wi-Fi.

Commandes utiles :

```bash
npm run lint
npm test
npx tsc --noEmit
```

## Configuration

Copie [`.env.example`](.env.example) vers `.env`. Le fichier `.env` est ignoré par Git. N’y place jamais la clé `service_role` ni une clé Gemini : tout nom qui commence par `EXPO_PUBLIC_` est inclus dans l’application.
