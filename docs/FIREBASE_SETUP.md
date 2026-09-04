# Firebase Setup For Washora

Last updated: 2026-09-04

This app is designed to run on the Firebase Spark plan for the MVP.

## 1. Create Firebase Project

1. Go to Firebase Console.
2. Create a new project.
3. Keep Google Analytics off unless you want it.
4. Stay on the Spark plan.

## 2. Register Web App

1. Open Project settings.
2. Under Your apps, choose Web app.
3. Register the app as `washora-admin`.
4. Copy the Firebase config values.

## 3. Create `.env`

From the project root:

```powershell
cd C:\projects\washora-app
Copy-Item .env.example .env
```

Then fill `.env`:

```text
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_ENABLE_DEMO_MODE=false
```

Do not commit `.env`.

## 4. Enable Authentication

1. Open Authentication.
2. Click Get started.
3. Open Sign-in method.
4. Enable Email/Password.
5. Add the first admin user manually from the Users tab.

Recommended for MVP:

- Email/password only.
- Avoid SMS/Phone Auth to keep the app free-tier friendly.

## 5. Enable Firestore

1. Open Firestore Database.
2. Create database.
3. Choose production mode.
4. Select the nearest available region.
5. Deploy the rules in `firestore.rules`.

Initial MVP rule:

```js
allow read, write: if request.auth != null;
```

This means only signed-in users can read or write app data. Before giving access to more users, change this to an admin allowlist rule.

### Deploy Rules With CLI

The browser Firebase Console login is separate from Firebase CLI login. If the app shows `Missing or insufficient permissions`, deploy rules using:

```powershell
cd C:\projects\washora-app
npx --yes firebase-tools login
npx --yes firebase-tools deploy --only firestore:rules
```

The repo has:

```text
firebase.json
.firebaserc
firestore.rules
```

so the CLI knows which project and rules file to use.

### Publish Rules Manually

If you do not want to use the CLI:

1. Open Firebase Console.
2. Open Firestore Database.
3. Open the Rules tab.
4. Replace the rules with the contents of `firestore.rules`.
5. Click Publish.

## 6. Restart Local Dev Server

```powershell
cd C:\projects\washora-app
npm run dev -- --force
```

Open:

```text
http://localhost:5173
```

The app should now show Firebase login instead of demo data.

## 7. Seed Firestore

After signing in:

1. Open Settings.
2. Click Seed Firestore.
3. The app writes workbook-derived seed records to:

```text
orders
customers
expenses
priceItems
settings/app
```

Use this once for initial setup. After that, normal app actions write directly to Firestore.

## 8. Deploy Hosting Later

When ready:

```powershell
npm run build
firebase login
firebase init hosting
firebase deploy
```

The repo already includes `firebase.json`, so hosting should point to:

```text
dist
```

## Notes

- Firebase config values are safe to place in frontend `.env`; security is enforced by Firebase Auth and Firestore rules.
- Browser localStorage is no longer the default data store.
- Demo storage is only enabled when `VITE_ENABLE_DEMO_MODE=true`.
- Firestore listeners start only after Firebase Auth has a signed-in user.
- Analytics is optional and only starts when `VITE_FIREBASE_MEASUREMENT_ID` exists.
- Firestore offline persistence is not enabled yet.
