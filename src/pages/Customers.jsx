import { Edit3, Plus, Save, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { buildCustomerStats } from "../utils/calculations";
import { formatCurrency, formatDate, makeCustomerId, normalizeSearch } from "../utils/helpers";

const emptyCustomer = {
  id: "",
  name: "",
  phone: "",
  area: "",
  address: "",
  notes: "",
};

function CustomerModal({ customer, open, onClose, onSave }) {
  const [draft, setDraft] = useState(emptyCustomer);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(customer || emptyCustomer);
    }
  }, [customer, open]);

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
        id: draft.id || makeCustomerId(draft.name, draft.area || draft.address, draft.phone),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal-panel modal-panel--narrow" aria-modal="true" role="dialog">
        <div className="modal-panel__header">
          <div>
            <span className="eyebrow">{customer ? "Edit customer" : "New customer"}</span>
            <h2>{draft.name || "Customer"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Customer ID</span>
            <input
              value={draft.id}
              onChange={(event) => updateField("id", event.target.value)}
              placeholder="Auto if blank"
              disabled={Boolean(customer)}
            />
          </label>

          <label>
            <span>Name</span>
            <input value={draft.name} onChange={(event) => updateField("name", event.target.value)} required />
          </label>

          <label>
            <span>Phone</span>
            <input value={draft.phone || ""} onChange={(event) => updateField("phone", event.target.value)} />
          </label>

          <label>
            <span>Area</span>
            <input value={draft.area || ""} onChange={(event) => updateField("area", event.target.value)} />
          </label>

          <label className="form-grid__wide">
            <span>Address</span>
            <textarea value={draft.address || ""} onChange={(event) => updateField("address", event.target.value)} />
          </label>

          <label className="form-grid__wide">
            <span>Notes</span>
            <textarea value={draft.notes || ""} onChange={(event) => updateField("notes", event.target.value)} />
          </label>

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

export function Customers({ customers, orders, onSaveCustomer }) {
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const visibleCustomers = useMemo(() => {
    const search = normalizeSearch(query);

    return customers
      .map((customer) => ({
        ...customer,
        stats: buildCustomerStats(customer, orders),
      }))
      .filter((customer) =>
        search
          ? normalizeSearch(
              `${customer.name} ${customer.phone} ${customer.address} ${customer.area} ${customer.id}`,
            ).includes(search)
          : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, orders, query]);

  const openNewCustomer = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const openEditCustomer = (customer) => {
    setEditingCustomer(customer);
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
            placeholder="Search customers"
          />
        </label>
        <button className="primary-button" type="button" onClick={openNewCustomer}>
          <Plus size={18} />
          Customer
        </button>
      </section>

      <section className="customer-grid">
        {visibleCustomers.length ? (
          visibleCustomers.map((customer) => (
            <article className="customer-card" key={customer.id}>
              <div className="customer-card__top">
                <div className="avatar">
                  <UserRound size={22} />
                </div>
                <div>
                  <h3>{customer.name}</h3>
                  <span>{customer.phone || "No phone"}</span>
                  <p>{customer.address || customer.area || "No address"}</p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => openEditCustomer(customer)}
                  title="Edit customer"
                >
                  <Edit3 size={18} />
                </button>
              </div>
              <dl>
                <div>
                  <dt>Orders</dt>
                  <dd>{customer.stats.totalOrders}</dd>
                </div>
                <div>
                  <dt>Revenue</dt>
                  <dd>{formatCurrency(customer.stats.totalRevenue)}</dd>
                </div>
                <div>
                  <dt>First</dt>
                  <dd>{formatDate(customer.stats.firstOrderDate) || "-"}</dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <EmptyState title="No customers found" detail="Customer records are created from orders." />
        )}
      </section>

      <CustomerModal
        customer={editingCustomer}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveCustomer}
      />
    </div>
  );
}
