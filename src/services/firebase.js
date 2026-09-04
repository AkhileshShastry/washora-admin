const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
].every(Boolean);

export const isDemoModeEnabled = import.meta.env.VITE_ENABLE_DEMO_MODE === "true";
export const requiresFirebaseSetup = !isFirebaseConfigured && !isDemoModeEnabled;
export const firebaseMode = isFirebaseConfigured ? "firestore" : isDemoModeEnabled ? "demo" : "setup";

let appPromise;
let authPromise;
let dbPromise;
let analyticsPromise;

export async function getFirebaseApp() {
  if (!isFirebaseConfigured) {
    return null;
  }

  if (!appPromise) {
    appPromise = import("firebase/app").then(({ getApp, getApps, initializeApp }) =>
      getApps().length ? getApp() : initializeApp(firebaseConfig),
    );
  }

  return appPromise;
}

export async function getFirebaseAuth() {
  if (!isFirebaseConfigured) {
    return null;
  }

  if (!authPromise) {
    authPromise = getFirebaseApp().then(async (app) => {
      const { getAuth } = await import("firebase/auth");
      return getAuth(app);
    });
  }

  return authPromise;
}

export async function getFirebaseDb() {
  if (!isFirebaseConfigured) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = getFirebaseApp().then(async (app) => {
      const { getFirestore } = await import("firebase/firestore");
      return getFirestore(app);
    });
  }

  return dbPromise;
}

export async function initFirebaseAnalytics() {
  if (!isFirebaseConfigured || !firebaseConfig.measurementId) {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = Promise.all([getFirebaseApp(), import("firebase/analytics")]).then(
      async ([app, { getAnalytics, isSupported }]) => {
        if (!(await isSupported())) {
          return null;
        }

        return getAnalytics(app);
      },
    );
  }

  return analyticsPromise;
}
