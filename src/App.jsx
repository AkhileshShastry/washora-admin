import { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { Expenses } from "./pages/Expenses";
import { FirebaseSetup } from "./pages/FirebaseSetup";
import { Login } from "./pages/Login";
import { Orders } from "./pages/Orders";
import { Pricing } from "./pages/Pricing";
import { Settings } from "./pages/Settings";
import { useAuth } from "./hooks/useAuth";
import { useWashoraData } from "./hooks/useWashoraData";
import { initFirebaseAnalytics } from "./services/firebase";

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <img src="/washora-logo.jpeg" alt="Washora Laundry Services" />
      <span>Loading Washora</span>
    </main>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const auth = useAuth();
  const data = useWashoraData({ enabled: Boolean(auth.user) });

  useEffect(() => {
    initFirebaseAnalytics().catch(() => {});
  }, []);

  if (auth.loading || data.loading) {
    return <LoadingScreen />;
  }

  if (auth.requiresFirebaseSetup || data.requiresFirebaseSetup) {
    return <FirebaseSetup />;
  }

  if (!auth.user) {
    return <Login error={auth.error} onLogin={auth.login} />;
  }

  const pageProps = {
    orders: data.orders,
    customers: data.customers,
    expenses: data.expenses,
    priceItems: data.priceItems,
  };

  const page = {
    Dashboard: <Dashboard {...pageProps} onOpenOrders={() => setActivePage("Orders")} />,
    Orders: (
      <Orders
        {...pageProps}
        onDeleteOrder={data.deleteOrder}
        onSaveOrder={data.upsertOrder}
        onStatusChange={data.updateOrderStatus}
      />
    ),
    Customers: <Customers {...pageProps} onSaveCustomer={data.upsertCustomer} />,
    Expenses: (
      <Expenses
        expenses={data.expenses}
        onSaveExpense={data.upsertExpense}
        onDeleteExpense={data.deleteExpense}
      />
    ),
    Pricing: <Pricing priceItems={data.priceItems} onSavePriceItem={data.upsertPriceItem} />,
    Settings: (
      <Settings
        demoStorageSummary={data.demoStorageSummary}
        isDemoMode={data.isDemoMode}
        settings={data.settings}
        onImportExcelFile={data.importExcelFile}
        onMigrateDemoStorage={data.migrateDemoStorage}
        onResetDemo={data.resetDemoData}
        onSeedRemote={data.seedRemote}
        onUpdateSettings={data.updateSettings}
      />
    ),
  }[activePage];

  return (
    <AppLayout
      activePage={activePage}
      isDemoMode={data.isDemoMode}
      onLogout={auth.logout}
      onPageChange={setActivePage}
      onResetDemo={data.resetDemoData}
    >
      {data.error ? <div className="error-banner">{data.error}</div> : null}
      {page}
    </AppLayout>
  );
}
