import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { AddOrderModal } from "../components/orders/AddOrderModal";
import { OrderCard } from "../components/orders/OrderCard";
import { normalizeSearch, sortByDateDesc } from "../utils/helpers";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "../utils/statuses";

export function Orders({
  orders,
  customers,
  priceItems,
  settings,
  onDeleteOrder,
  onSaveOrder,
  onStatusChange,
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [payment, setPayment] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  const visibleOrders = useMemo(() => {
    const search = normalizeSearch(query);

    return sortByDateDesc(orders).filter((order) => {
      const matchesSearch = search
        ? normalizeSearch(
            `${order.receiptId} ${order.customerName} ${order.phone} ${order.address} ${order.area}`,
          ).includes(search)
        : true;
      const matchesStatus = status === "All" || order.orderStatus === status;
      const matchesPayment = payment === "All" || order.paymentStatus === payment;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, payment, query, status]);

  const openNewOrder = () => {
    setEditingOrder(null);
    setModalOpen(true);
  };

  const openEditOrder = (order) => {
    setEditingOrder(order);
    setModalOpen(true);
  };

  return (
    <div className="page-stack">
      <section className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders" />
        </label>
        <button className="primary-button" type="button" onClick={openNewOrder}>
          <Plus size={18} />
          Order
        </button>
      </section>

      <section className="filter-row">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="All">All orders</option>
          {ORDER_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={payment} onChange={(event) => setPayment(event.target.value)}>
          <option value="All">All payments</option>
          {PAYMENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </section>

      <section className="order-grid">
        {visibleOrders.length ? (
          visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDelete={onDeleteOrder}
              onEdit={openEditOrder}
              onStatusChange={onStatusChange}
            />
          ))
        ) : (
          <EmptyState title="No orders found" detail="Try a different search or filter." />
        )}
      </section>

      <AddOrderModal
        open={modalOpen}
        order={editingOrder}
        orders={orders}
        customers={customers}
        priceItems={priceItems}
        settings={settings}
        onClose={() => setModalOpen(false)}
        onSave={onSaveOrder}
      />
    </div>
  );
}
