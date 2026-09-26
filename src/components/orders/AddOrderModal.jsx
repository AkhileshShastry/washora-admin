import { Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calculateOrderTotals } from "../../utils/calculations";
import {
  calculateDeliveryCharge,
  calculateFuelCostPerKm,
  calculateRouteDistanceKm,
} from "../../utils/distance";
import { formatCurrency, makeReceiptId, toInputDate } from "../../utils/helpers";
import {
  ORDER_STATUSES,
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  REFERRAL_SOURCES,
  STAFF_MEMBERS,
} from "../../utils/statuses";

function createLine(priceItems) {
  const first = priceItems.find((item) => item.active !== false);

  return {
    id: crypto?.randomUUID?.() || `${Date.now()}`,
    serviceType: first?.serviceType || "",
    quantity: 1,
    customerPrice: first?.customerPrice || 0,
    dhobiCost: first?.dhobiCost || 0,
  };
}

function createDraft(order, orders, priceItems) {
  if (order) {
    return {
      ...order,
      orderDate: toInputDate(order.orderDate),
      pickupDate: toInputDate(order.pickupDate),
      deliveryDate: toInputDate(order.deliveryDate),
      items: order.items?.length ? order.items : [createLine(priceItems)],
    };
  }

  return {
    id: "",
    receiptId: makeReceiptId(orders),
    orderDate: toInputDate(new Date()),
    customerId: "",
    customerName: "",
    phone: "",
    address: "",
    area: "",
    latitude: "",
    longitude: "",
    routeDistanceKm: 0,
    deliveryCharge: 0,
    items: [createLine(priceItems)],
    orderStatus: "Order Placed",
    paymentStatus: "Pending",
    paymentMode: "UPI",
    pickupDate: "",
    deliveryDate: "",
    pickupStatus: "",
    deliveryStatus: "",
    collectedBy: STAFF_MEMBERS[0],
    deliveredBy: "",
    customerNotes: "",
    referralSource: "",
  };
}

export function AddOrderModal({ open, order, orders, customers, priceItems, settings, onClose, onSave }) {
  const [draft, setDraft] = useState(() => createDraft(order, orders, priceItems));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(createDraft(order, orders, priceItems));
    }
  }, [open, order, orders, priceItems]);

  const routeDistanceKm = calculateRouteDistanceKm({
    business: settings?.businessLocation,
    customer: draft,
    dhobi: settings?.dhobiLocation,
  });
  const fuelCostPerKm =
    settings?.fuelCostPerKm ||
    calculateFuelCostPerKm(settings?.petrolPricePerLitre, settings?.vehicleMileageKmPerLitre) ||
    settings?.deliveryRatePerKm;
  const deliveryCharge = calculateDeliveryCharge(routeDistanceKm, fuelCostPerKm);
  const totals = useMemo(
    () => calculateOrderTotals(draft.items || [], deliveryCharge),
    [deliveryCharge, draft.items],
  );

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateLine = (lineId, patch) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === lineId ? { ...item, ...patch } : item)),
    }));
  };

  const selectPrice = (lineId, serviceType) => {
    const price = priceItems.find((item) => item.serviceType === serviceType);
    updateLine(lineId, {
      serviceType,
      customerPrice: price?.customerPrice || 0,
      dhobiCost: price?.dhobiCost || 0,
    });
  };

  const selectCustomer = (customerId) => {
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) {
      updateField("customerId", "");
      return;
    }

    setDraft((current) => ({
      ...current,
      customerId,
      customerName: customer.name,
      phone: customer.phone,
      address: customer.address,
      area: customer.area,
      latitude: customer.latitude || "",
      longitude: customer.longitude || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onSave({
        ...draft,
        ...totals,
        routeDistanceKm,
        deliveryCharge,
        id: draft.id || draft.receiptId.toLowerCase(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal-panel" aria-modal="true" role="dialog">
        <div className="modal-panel__header">
          <div>
            <span className="eyebrow">{order ? "Edit order" : "New order"}</span>
            <h2>{draft.receiptId}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Receipt</span>
            <input value={draft.receiptId} onChange={(event) => updateField("receiptId", event.target.value)} />
          </label>

          <label>
            <span>Order date</span>
            <input
              type="date"
              value={draft.orderDate}
              onChange={(event) => updateField("orderDate", event.target.value)}
              required
            />
          </label>

          <label className="form-grid__wide">
            <span>Customer</span>
            <select value={draft.customerId} onChange={(event) => selectCustomer(event.target.value)}>
              <option value="">New customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone || customer.area}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Name</span>
            <input
              value={draft.customerName}
              onChange={(event) => updateField("customerName", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Phone</span>
            <input value={draft.phone} onChange={(event) => updateField("phone", event.target.value)} />
          </label>

          <label>
            <span>Area</span>
            <input value={draft.area || ""} onChange={(event) => updateField("area", event.target.value)} />
          </label>

          <label className="form-grid__wide">
            <span>Address</span>
            <textarea value={draft.address || ""} onChange={(event) => updateField("address", event.target.value)} />
          </label>

          <label>
            <span>Latitude</span>
            <input
              type="number"
              step="any"
              value={draft.latitude || ""}
              onChange={(event) => updateField("latitude", event.target.value)}
            />
          </label>

          <label>
            <span>Longitude</span>
            <input
              type="number"
              step="any"
              value={draft.longitude || ""}
              onChange={(event) => updateField("longitude", event.target.value)}
            />
          </label>

          <div className="line-items form-grid__wide">
            <div className="line-items__header">
              <strong>Items</strong>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    items: [...current.items, createLine(priceItems)],
                  }))
                }
              >
                <Plus size={17} />
                Add
              </button>
            </div>

            {draft.items.map((item) => (
              <div className="line-item" key={item.id}>
                <label>
                  <span>Service</span>
                  <select value={item.serviceType} onChange={(event) => selectPrice(item.id, event.target.value)}>
                    {priceItems
                      .filter((price) => price.active !== false)
                      .map((price) => (
                        <option key={price.id} value={price.serviceType}>
                          {price.serviceType}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span>Qty</span>
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(event) => updateLine(item.id, { quantity: event.target.value })}
                  />
                </label>
                <label>
                  <span>Price</span>
                  <input
                    type="number"
                    min="0"
                    value={item.customerPrice}
                    onChange={(event) => updateLine(item.id, { customerPrice: event.target.value })}
                  />
                </label>
                <label>
                  <span>Dhobi</span>
                  <input
                    type="number"
                    min="0"
                    value={item.dhobiCost}
                    onChange={(event) => updateLine(item.id, { dhobiCost: event.target.value })}
                  />
                </label>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      items:
                        current.items.length === 1
                          ? current.items
                          : current.items.filter((line) => line.id !== item.id),
                    }))
                  }
                  title="Remove item"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>

          <label>
            <span>Order status</span>
            <select value={draft.orderStatus} onChange={(event) => updateField("orderStatus", event.target.value)}>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Payment</span>
            <select
              value={draft.paymentStatus}
              onChange={(event) => updateField("paymentStatus", event.target.value)}
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Mode</span>
            <select value={draft.paymentMode} onChange={(event) => updateField("paymentMode", event.target.value)}>
              <option value="">Pending</option>
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Pickup date</span>
            <input type="date" value={draft.pickupDate || ""} onChange={(event) => updateField("pickupDate", event.target.value)} />
          </label>

          <label>
            <span>Delivery date</span>
            <input type="date" value={draft.deliveryDate || ""} onChange={(event) => updateField("deliveryDate", event.target.value)} />
          </label>

          <label>
            <span>Collected by</span>
            <input value={draft.collectedBy || ""} onChange={(event) => updateField("collectedBy", event.target.value)} />
          </label>

          <label>
            <span>Delivered by</span>
            <input value={draft.deliveredBy || ""} onChange={(event) => updateField("deliveredBy", event.target.value)} />
          </label>

          <label>
            <span>Referral</span>
            <input
              list="referrals"
              value={draft.referralSource || ""}
              onChange={(event) => updateField("referralSource", event.target.value)}
            />
          </label>
          <datalist id="referrals">
            {REFERRAL_SOURCES.map((source) => (
              <option key={source} value={source} />
            ))}
          </datalist>

          <label className="form-grid__wide">
            <span>Notes</span>
            <textarea
              value={draft.customerNotes || ""}
              onChange={(event) => updateField("customerNotes", event.target.value)}
            />
          </label>

          <div className="modal-summary form-grid__wide">
            <span>{totals.clothesCount} pcs</span>
            <span>{formatCurrency(totals.dhobiCost)} dhobi</span>
            <span>{routeDistanceKm ? `${routeDistanceKm.toFixed(1)} km route` : "Route unavailable"}</span>
            <span>{formatCurrency(deliveryCharge)} fuel</span>
            <strong>{formatCurrency(totals.totalAmount)}</strong>
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
