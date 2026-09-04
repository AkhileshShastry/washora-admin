import { ExternalLink, KeyRound, ShieldCheck } from "lucide-react";

export function FirebaseSetup() {
  return (
    <main className="setup-page">
      <section className="setup-panel">
        <img src="/washora-logo.jpeg" alt="Washora Laundry Services" />
        <div>
          <span className="eyebrow">Setup required</span>
          <h1>Connect Firebase</h1>
          <p>
            Add the Firebase Web app values to `.env`, then restart the dev server.
          </p>
        </div>

        <div className="setup-steps">
          <article>
            <KeyRound size={20} />
            <div>
              <strong>Create `.env`</strong>
              <code>Copy-Item .env.example .env</code>
            </div>
          </article>
          <article>
            <ExternalLink size={20} />
            <div>
              <strong>Paste Firebase config</strong>
              <span>Use Project settings - General - Your apps - Web app.</span>
            </div>
          </article>
          <article>
            <ShieldCheck size={20} />
            <div>
              <strong>Enable Auth and Firestore</strong>
              <span>Use email/password login and Firestore on the Spark plan.</span>
            </div>
          </article>
        </div>

        <pre>{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ENABLE_DEMO_MODE=false`}</pre>
      </section>
    </main>
  );
}
