import { Cloud, Database, FileSpreadsheet, MapPin, RotateCcw, Upload, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { calculateFuelCostPerKm } from "../utils/distance";

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
  const [businessLocation, setBusinessLocation] = useState(settings.businessLocation || {});
  const [dhobiLocation, setDhobiLocation] = useState(settings.dhobiLocation || {});
  const [deliveryRatePerKm, setDeliveryRatePerKm] = useState(settings.deliveryRatePerKm || 0);
  const [petrolPricePerLitre, setPetrolPricePerLitre] = useState(settings.petrolPricePerLitre || 0);
  const [vehicleMileageKmPerLitre, setVehicleMileageKmPerLitre] = useState(
    settings.vehicleMileageKmPerLitre || 0,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStaffText((settings.staffMembers || []).join(", "));
    setBusinessLocation(settings.businessLocation || {});
    setDhobiLocation(settings.dhobiLocation || {});
    setDeliveryRatePerKm(settings.deliveryRatePerKm || 0);
    setPetrolPricePerLitre(settings.petrolPricePerLitre || 0);
    setVehicleMileageKmPerLitre(settings.vehicleMileageKmPerLitre || 0);
  }, [settings]);

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
        businessLocation,
        dhobiLocation,
        deliveryRatePerKm: Number(deliveryRatePerKm || 0),
        petrolPricePerLitre: Number(petrolPricePerLitre || 0),
        vehicleMileageKmPerLitre: Number(vehicleMileageKmPerLitre || 0),
        fuelCostPerKm: calculateFuelCostPerKm(petrolPricePerLitre, vehicleMileageKmPerLitre),
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

        <article className="panel route-settings">
          <div className="settings-line">
            <MapPin size={22} />
            <div>
              <h2>Delivery route pricing</h2>
              <span>5 legs: pickup, dhobi drop, return, dhobi collection, customer delivery</span>
            </div>
          </div>
          <div className="form-grid">
            <label>
              <span>Business latitude</span>
              <input
                type="number"
                step="any"
                value={businessLocation.latitude || ""}
                onChange={(event) => setBusinessLocation({ ...businessLocation, latitude: event.target.value })}
                placeholder="e.g. 12.9141"
              />
            </label>
            <label>
              <span>Business longitude</span>
              <input
                type="number"
                step="any"
                value={businessLocation.longitude || ""}
                onChange={(event) => setBusinessLocation({ ...businessLocation, longitude: event.target.value })}
                placeholder="e.g. 74.8560"
              />
            </label>
            <label>
              <span>Dhobi latitude</span>
              <input
                type="number"
                step="any"
                value={dhobiLocation.latitude || ""}
                onChange={(event) => setDhobiLocation({ ...dhobiLocation, latitude: event.target.value })}
              />
            </label>
            <label>
              <span>Dhobi longitude</span>
              <input
                type="number"
                step="any"
                value={dhobiLocation.longitude || ""}
                onChange={(event) => setDhobiLocation({ ...dhobiLocation, longitude: event.target.value })}
              />
            </label>
            <label>
              <span>Petrol price per litre</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={petrolPricePerLitre}
                onChange={(event) => setPetrolPricePerLitre(event.target.value)}
              />
            </label>
            <label>
              <span>Vehicle mileage (km/litre)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={vehicleMileageKmPerLitre}
                onChange={(event) => setVehicleMileageKmPerLitre(event.target.value)}
              />
            </label>
          </div>
          <span className="settings-hint">
            Fuel cost per km: ₹{calculateFuelCostPerKm(petrolPricePerLitre, vehicleMileageKmPerLitre).toFixed(2)}
            . Leave locations blank to skip automatic delivery charges.
          </span>
          <button className="primary-button" type="button" onClick={saveSettings} disabled={saving}>
            Save route pricing
          </button>
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
