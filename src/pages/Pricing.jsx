import { Edit3, Plus, Save, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { formatCurrency, makeId, normalizeSearch } from "../utils/helpers";

const emptyPrice = {
  id: "",
  serviceType: "",
  customerPrice: "",
  dhobiCost: "",
  active: true,
};

function PricingModal({ open, priceItem, onClose, onSave }) {
  const [draft, setDraft] = useState(emptyPrice);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(priceItem || emptyPrice);
    }
  }, [open, priceItem]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onSave({
        ...draft,
        id: draft.id || makeId("price"),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const profit = Number(draft.customerPrice || 0) - Number(draft.dhobiCost || 0);

  return (
    <div className="modal-backdrop">
      <section className="modal-panel modal-panel--narrow" aria-modal="true" role="dialog">
        <div className="modal-panel__header">
          <div>
            <span className="eyebrow">{priceItem ? "Edit price" : "New price"}</span>
            <h2>{draft.serviceType || "Service"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="form-grid__wide">
            <span>Service type</span>
            <input
              value={draft.serviceType}
              onChange={(event) => updateField("serviceType", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Customer price</span>
            <input
              type="number"
              min="0"
              value={draft.customerPrice}
              onChange={(event) => updateField("customerPrice", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Dhobi cost</span>
            <input
              type="number"
              min="0"
              value={draft.dhobiCost}
              onChange={(event) => updateField("dhobiCost", event.target.value)}
            />
          </label>

          <label className="toggle-line">
            <input
              type="checkbox"
              checked={draft.active !== false}
              onChange={(event) => updateField("active", event.target.checked)}
            />
            <span>Active</span>
          </label>

          <div className="modal-summary form-grid__wide">
            <span>Profit</span>
            <strong>{formatCurrency(profit)}</strong>
          </div>

          <div className="modal-panel__footer form-grid__wide">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              <Save size={18} />
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function Pricing({ priceItems, onSavePriceItem }) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);

  const visiblePrices = useMemo(() => {
    const search = normalizeSearch(query);

    return [...priceItems]
      .filter((price) =>
        search
          ? normalizeSearch(
              `${price.serviceType} ${price.customerPrice} ${price.dhobiCost} ${price.profit}`,
            ).includes(search)
          : true,
      )
      .sort((a, b) => a.serviceType.localeCompare(b.serviceType));
  }, [priceItems, query]);

  const openNewPrice = () => {
    setEditingPrice(null);
    setModalOpen(true);
  };

  const editPrice = (price) => {
    setEditingPrice(price);
    setModalOpen(true);
  };

  return (
    <div className="page-stack">
      <section className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search prices"
          />
        </label>
        <button className="primary-button" type="button" onClick={openNewPrice}>
          <Plus size={18} />
          Price
        </button>
      </section>

      <section className="table-shell">
        {visiblePrices.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Dhobi</th>
                  <th scope="col">Profit</th>
                  <th scope="col">Status</th>
                  <th scope="col">Edit</th>
                </tr>
              </thead>
              <tbody>
                {visiblePrices.map((price) => (
                  <tr key={price.id}>
                    <td className="data-table__title">{price.serviceType}</td>
                    <td>{formatCurrency(price.customerPrice)}</td>
                    <td>{formatCurrency(price.dhobiCost)}</td>
                    <td className="data-table__profit">{formatCurrency(price.profit)}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          price.active === false ? "status-pill--slate" : "status-pill--green"
                        }`}
                      >
                        {price.active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => editPrice(price)}
                        title="Edit price"
                      >
                        <Edit3 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No prices found" detail="Add service prices before creating detailed orders." />
        )}
      </section>

      <PricingModal
        open={modalOpen}
        priceItem={editingPrice}
        onClose={() => setModalOpen(false)}
        onSave={onSavePriceItem}
      />
    </div>
  );
}
