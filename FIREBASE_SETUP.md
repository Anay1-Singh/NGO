# ServeBase Firebase Setup

This document covers the local Firebase integration. It does not deploy Firebase rules, create live bootstrap records, run live migration, or upload Storage files.

## Firebase project

- Project name: `ngo-01`
- Project ID: `ngo-01-c62cb`
- Registered web app: `ServeBase-Web`
- Firestore database: default database, `asia-south2` (Delhi)
- Authentication currently enabled: Email/Password
- Current plan: Spark

## Obtain the web configuration

In the Firebase Console, open project `ngo-01-c62cb`, then open Project settings and select the `ServeBase-Web` web app. In the Firebase SDK setup area, choose the configuration object for the web app. Copy only the public web configuration values into the local environment file. Do not copy service-account JSON, private keys, Admin SDK credentials, or other server-only secrets into this project.

## Configure `.env.local`

1. Copy `.env.example` to `.env.local`.
2. Replace each blank value with the exact value from the Firebase Console.
3. Keep `.env.local` local. It is ignored by Git.
4. Never commit the values or place them in source code.

Required variables:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ORGANIZATION_ID=servebase-main
```

The expected project ID is `ngo-01-c62cb`. The project ID in the supplied configuration should be checked against that value before any later data access is enabled.

`VITE_ORGANIZATION_ID` defaults to `servebase-main` in the application when omitted, but it should be set explicitly in `.env.local` for version one.

## Restart Vite

Vite reads environment variables when the development server starts. Stop the running server, populate or change `.env.local`, then run:

```bash
npm run dev
```

## Initialization architecture

`src/lib/firebase.ts` reads the six `VITE_FIREBASE_*` variables and throws a setup error listing any missing variable. It uses the modular Firebase SDK:

- `getApps()` / `getApp()` or `initializeApp()` for the singleton Firebase app.
- `getAuth(app)` for the Firebase Authentication instance.
- `getFirestore(app)` for the Cloud Firestore instance.

The module exports `app`, `auth`, and `db` for repository and authentication work. Missing configuration is reported through the application status banner rather than crashing the app. When configured, the application uses the Firebase Auth and Firestore helpers under `src/lib`.

## Configured and deferred services

Configured in the SDK module:

- Firebase App
- Firebase Authentication client instance
- Cloud Firestore client instance

The current integration uses Email/Password authentication for volunteer and administrative sign-in. Firestore writes remain governed by the rules and repository layer; no live records are created automatically.

Intentionally deferred:

- Firebase Storage and profile-photo uploads. The project remains on Spark and existing LocalStorage photo data must not be discarded.
- Cloud Functions, Firebase Admin SDK, security rules, indexes, and deployment.

## Safety and verification notes

The Firebase web configuration is designed for client initialization and is not a service-account credential. Firestore and Authentication access remain governed by Firebase Security Rules and Firebase Authentication configuration; no security-sensitive authorization is implemented by this module.

With no `.env.local`, the module remains unconfigured and the application displays a setup warning. Once exact Console values are supplied locally, the Auth and Firestore paths can be exercised against the Firebase Emulator Suite. This repository does not create live bootstrap records or run live migration automatically.
