import { Edit3, IndianRupee, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { formatCurrency, formatDate, makeId, normalizeSearch, sortByDateDesc, sum } from "../utils/helpers";
import { getExpenseSettlementStatus, isExpenseSettled } from "../utils/settlements";
import { EXPENSE_TYPES, STAFF_MEMBERS } from "../utils/statuses";

function createEmptyExpense() {
  return {
    date: new Date().toISOString().slice(0, 10),
    expenseType: "Dhobi",
    description: "",
    amount: "",
    paidBy: STAFF_MEMBERS[0],
    settlementStatus: "Unsettled",
  };
}

function ExpenseModal({ open, expense, onClose, onSave }) {
  const [draft, setDraft] = useState(createEmptyExpense);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(
        expense
          ? {
              date: expense.date || createEmptyExpense().date,
              expenseType: expense.expenseType || EXPENSE_TYPES[0],
              description: expense.description || "",
              amount: expense.amount ?? "",
              paidBy: expense.paidBy || STAFF_MEMBERS[0],
            }
          : createEmptyExpense(),
      );
    }
  }, [open, expense]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onSave({ ...(expense || {}), ...draft, id: expense?.id || makeId("expense") });
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
            <span className="eyebrow">{expense ? "Edit expense" : "New expense"}</span>
            <h2>{draft.description || (expense ? draft.expenseType : "Expense")}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => updateField("date", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Expense type</span>
            <select
              value={draft.expenseType}
              onChange={(event) => updateField("expenseType", event.target.value)}
            >
              {EXPENSE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="form-grid__wide">
            <span>Description</span>
            <input
              value={draft.description}
              onChange={(event) => updateField("description", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Amount</span>
            <input
              type="number"
              min="0"
              value={draft.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              required
            />
          </label>

          <label>
            <span>Paid by</span>
            <select value={draft.paidBy} onChange={(event) => updateField("paidBy", event.target.value)}>
              {STAFF_MEMBERS.map((staff) => (
                <option key={staff} value={staff}>
                  {staff}
                </option>
              ))}
            </select>
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

export function Expenses({ expenses, onSaveExpense, onDeleteExpense }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [query, setQuery] = useState("");

  const visibleExpenses = useMemo(() => {
    const search = normalizeSearch(query);

    return sortByDateDesc(expenses, "date").filter((expense) =>
      search
        ? normalizeSearch(
            `${expense.expenseType} ${expense.description} ${expense.paidBy} ${expense.amount} ${getExpenseSettlementStatus(expense)}`,
          ).includes(search)
        : true,
    );
  }, [expenses, query]);

  const openNewExpense = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingExpense(null);
  };

  return (
    <div className="page-stack">
      <section className="expense-summary">
        <IndianRupee size={24} />
        <div>
          <span>Total expenses</span>
          <strong>{formatCurrency(sum(expenses, (expense) => expense.amount))}</strong>
        </div>
      </section>

      <section className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses" />
        </label>
        <button className="primary-button" type="button" onClick={openNewExpense}>
          <Plus size={18} />
          Expense
        </button>
      </section>

      <section className="data-list">
        {visibleExpenses.length ? (
          visibleExpenses.map((expense) => (
            <article className="data-row expense-row" key={expense.id}>
              <div>
                <strong>{expense.description || expense.expenseType}</strong>
                <span>
                  {formatDate(expense.date)} - {expense.expenseType} - {expense.paidBy}
                </span>
              </div>
              <div className="expense-row__amount">
                <strong>{formatCurrency(expense.amount)}</strong>
                <span
                  className={`settlement-chip settlement-chip--${isExpenseSettled(expense) ? "settled" : "unsettled"}`}
                >
                  <span aria-hidden="true" />
                  {getExpenseSettlementStatus(expense)}
                </span>
              </div>
              <div className="data-row__actions">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => openEditExpense(expense)}
                  title="Edit expense"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  onClick={() => onDeleteExpense(expense.id)}
                  title="Delete expense"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="No expenses found" detail="Add expenses as they are paid." />
        )}
      </section>

      <ExpenseModal
        open={modalOpen}
        expense={editingExpense}
        onClose={closeModal}
        onSave={onSaveExpense}
      />
    </div>
  );
}
