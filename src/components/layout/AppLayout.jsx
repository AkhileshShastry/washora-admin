import { BottomNav } from "./BottomNav";
import { Header } from "./Header";

export function AppLayout({ activePage, isDemoMode, onLogout, onPageChange, onResetDemo, children }) {
  return (
    <div className="app-shell">
      <Header
        activePage={activePage}
        isDemoMode={isDemoMode}
        onLogout={onLogout}
        onResetDemo={onResetDemo}
      />
      <main className="app-main">{children}</main>
      <BottomNav activePage={activePage} onPageChange={onPageChange} />
    </div>
  );
}
