import { Cloud, Database, FileSpreadsheet, RotateCcw, Upload, UploadCloud } from "lucide-react";
import { useState } from "react";

export function Settings({
  demoStorageSummary,
  isDemoMode,
  settings,
  onImportExcelFile,
  onMigrateDemoStorage,
  onResetDemo,
  onSeedRemote,
  onUpdateSettings,
}) {
  const [staffText, setStaffText] = useState((settings.staffMembers || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const describeSummary = (summary) =>
    `${summary.orders || 0} orders, ${summary.customers || 0} customers, ${
      summary.expenses || 0
    } expenses, ${summary.priceItems || 0} prices`;

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");

    try {
      await onUpdateSettings({
        ...settings,
        staffMembers: staffText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setMessage("Settings saved.");
    } finally {
      setSaving(false);
    }
  };

  const seedRemote = async () => {
    setSaving(true);
    setMessage("");

    try {
      const summary = await onSeedRemote();
      setMessage(`Firestore seeded: ${describeSummary(summary)}.`);
    } catch (caught) {
      setMessage(caught.message || "Unable to seed Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const migrateDemoStorage = async () => {
    setSaving(true);
    setMessage("");

    try {
      const summary = await onMigrateDemoStorage();
      setMessage(`Browser data migrated: ${describeSummary(summary)}.`);
    } catch (caught) {
      setMessage(caught.message || "Unable to migrate browser data.");
    } finally {
      setSaving(false);
    }
  };

  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const summary = await onImportExcelFile(file);
      setMessage(`Excel imported: ${describeSummary(summary)}.`);
      event.target.value = "";
    } catch (caught) {
      setMessage(caught.message || "Unable to import Excel workbook.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="settings-grid">
        <article className="panel">
          <div className="settings-line">
            {isDemoMode ? <Database size={22} /> : <Cloud size={22} />}
            <div>
              <h2>{isDemoMode ? "Demo storage" : "Firestore"}</h2>
              <span>{isDemoMode ? "Browser local storage" : "Firebase project connected"}</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <label>
            <span>Staff names</span>
            <input value={staffText} onChange={(event) => setStaffText(event.target.value)} />
          </label>
          <button className="primary-button" type="button" onClick={saveSettings} disabled={saving}>
            Save
          </button>
        </article>

        <article className="panel action-panel">
          {isDemoMode ? (
            <button className="secondary-button" type="button" onClick={onResetDemo}>
              <RotateCcw size={18} />
              Reset demo data
            </button>
          ) : (
            <div className="migration-actions">
              <label className="file-picker">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={importExcel}
                  disabled={saving}
                />
                <FileSpreadsheet size={18} />
                <span>Import Excel</span>
              </label>

              <button
                className="secondary-button"
                type="button"
                onClick={migrateDemoStorage}
                disabled={saving || !demoStorageSummary?.exists}
              >
                <Upload size={18} />
                Migrate browser data
              </button>

              <button className="secondary-button" type="button" onClick={seedRemote} disabled={saving}>
                <UploadCloud size={18} />
                Seed built-in data
              </button>

              <span className="settings-hint">
                Browser data: {demoStorageSummary?.exists ? describeSummary(demoStorageSummary) : "none found"}
              </span>
            </div>
          )}
          {message ? <span className="success-note">{message}</span> : null}
        </article>
      </section>
    </div>
  );
}
