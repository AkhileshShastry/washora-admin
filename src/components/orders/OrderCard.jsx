import {
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  IndianRupee,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { downloadInvoice } from "../../services/invoiceService";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "../../utils/statuses";
import { StatusPill } from "../common/StatusPill";

export function OrderCard({ order, onEdit, onDelete, onStatusChange }) {
  const phone = String(order.phone || "").replace(/\D/g, "");
  const serviceSummary = (order.items || [])
    .map((item) => `${item.quantity} x ${item.serviceType}`)
    .join(", ");

  return (
    <article className="order-card">
      <div className="order-card__top">
        <div>
          <span className="eyebrow">{order.receiptId}</span>
          <h3>{order.customerName}</h3>
        </div>
        <strong>{formatCurrency(order.totalAmount)}</strong>
      </div>

      <div className="order-card__meta">
        <span>
          <CalendarDays size={15} />
          {formatDate(order.orderDate)}
        </span>
        <span>
          <UserRound size={15} />
          {order.area || order.address || "No area"}
        </span>
        <span>
          <IndianRupee size={15} />
          {order.paymentMode || "Mode pending"}
        </span>
        {order.deliveryCharge ? (
          <span>
            <IndianRupee size={15} />
            {formatCurrency(order.deliveryCharge)} delivery
            {order.routeDistanceKm ? ` (${Number(order.routeDistanceKm).toFixed(1)} km)` : ""}
          </span>
        ) : null}
      </div>

      <p className="order-card__services">{serviceSummary || order.serviceType || "No items"}</p>

      <div className="order-card__status">
        <StatusPill value={order.orderStatus} />
        <StatusPill value={order.paymentStatus} />
      </div>

      <div className="order-card__controls">
        <label>
          <span>Order</span>
          <select
            value={order.orderStatus}
            onChange={(event) => onStatusChange(order.id, { orderStatus: event.target.value })}
          >
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
            value={order.paymentStatus}
            onChange={(event) => onStatusChange(order.id, { paymentStatus: event.target.value })}
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="order-card__actions">
        {phone ? (
          <>
            <a className="icon-button" href={`tel:${phone}`} title="Call customer">
              <Phone size={18} />
            </a>
            <a className="icon-button icon-button--success" href={`https://wa.me/${phone}`} title="WhatsApp customer">
              <CheckCircle2 size={18} />
            </a>
          </>
        ) : null}
        <button className="icon-button" type="button" onClick={() => onEdit(order)} title="Edit order">
          <Edit3 size={18} />
        </button>
        <button className="icon-button" type="button" onClick={() => downloadInvoice(order)} title="Download invoice">
          <Download size={18} />
        </button>
        <button className="icon-button icon-button--danger" type="button" onClick={() => onDelete(order.id)} title="Delete order">
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  );
}
