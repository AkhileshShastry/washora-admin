import { LockKeyhole, LogIn } from "lucide-react";
import { useState } from "react";

export function Login({ error, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onLogin(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <img src="/washora-logo.jpeg" alt="Washora Laundry Services" />
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Washora</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? <LockKeyhole size={18} /> : <LogIn size={18} />}
            {submitting ? "Signing in" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
