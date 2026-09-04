import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFirebaseAuth,
  isDemoModeEnabled,
  isFirebaseConfigured,
  requiresFirebaseSetup,
} from "../services/firebase";

const demoUser = {
  uid: "demo-admin",
  email: "demo@washora.local",
  displayName: "Washora Admin",
};

export function useAuth() {
  const [user, setUser] = useState(isDemoModeEnabled ? demoUser : null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let unsubscribe = () => {};
    let disposed = false;

    Promise.all([getFirebaseAuth(), import("firebase/auth")])
      .then(([firebaseAuth, { onAuthStateChanged }]) => {
        if (disposed) {
          return;
        }

        unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
          setUser(nextUser);
          setLoading(false);
        });
      })
      .catch(() => setLoading(false));

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setError("");

    if (requiresFirebaseSetup) {
      const setupError = new Error("Firebase is not configured yet.");
      setError(setupError.message);
      throw setupError;
    }

    if (!isFirebaseConfigured) {
      setUser(demoUser);
      return demoUser;
    }

    try {
      const [firebaseAuth, { signInWithEmailAndPassword }] = await Promise.all([
        getFirebaseAuth(),
        import("firebase/auth"),
      ]);
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      setUser(credential.user);
      return credential.user;
    } catch (caught) {
      setError(caught.message || "Unable to sign in.");
      throw caught;
    }
  }, []);

  const logout = useCallback(async () => {
    if (isFirebaseConfigured) {
      const [firebaseAuth, { signOut }] = await Promise.all([getFirebaseAuth(), import("firebase/auth")]);
      await signOut(firebaseAuth);
    } else if (isDemoModeEnabled) {
      setUser(demoUser);
    }
  }, []);

  return useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      isFirebaseConfigured,
      isDemoMode: isDemoModeEnabled,
      requiresFirebaseSetup,
    }),
    [user, loading, error, login, logout],
  );
}
