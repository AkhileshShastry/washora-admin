import { LogOut, RefreshCw } from "lucide-react";

export function Header({ activePage, isDemoMode, onLogout, onResetDemo }) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <img src="/washora-logo.jpeg" alt="Washora Laundry Services" />
        <div>
          <span>Washora</span>
          <strong>{activePage}</strong>
        </div>
      </div>

      <div className="header-actions">
        <span className={`mode-badge ${isDemoMode ? "mode-badge--demo" : "mode-badge--live"}`}>
          {isDemoMode ? "Demo" : "Live"}
        </span>
        {isDemoMode ? (
          <button className="icon-button" type="button" onClick={onResetDemo} title="Reset demo data">
            <RefreshCw size={18} />
          </button>
        ) : null}
        <button className="icon-button" type="button" onClick={onLogout} title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
