import { IndianRupee, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { formatCurrency, formatDate, makeId, normalizeSearch, sortByDateDesc, sum } from "../utils/helpers";
import { EXPENSE_TYPES, STAFF_MEMBERS } from "../utils/statuses";

const emptyExpense = {
  date: new Date().toISOString().slice(0, 10),
  expenseType: "Dhobi",
  description: "",
  amount: "",
  paidBy: STAFF_MEMBERS[0],
};

export function Expenses({ expenses, onSaveExpense, onDeleteExpense }) {
  const [draft, setDraft] = useState(emptyExpense);
  const [query, setQuery] = useState("");

  const visibleExpenses = useMemo(() => {
    const search = normalizeSearch(query);

    return sortByDateDesc(expenses, "date").filter((expense) =>
      search
        ? normalizeSearch(
            `${expense.expenseType} ${expense.description} ${expense.paidBy} ${expense.amount}`,
          ).includes(search)
        : true,
    );
  }, [expenses, query]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSaveExpense({
      ...draft,
      id: makeId("expense"),
    });
    setDraft(emptyExpense);
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

      <form className="inline-form" onSubmit={handleSubmit}>
        <input
          type="date"
          value={draft.date}
          onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
          required
        />
        <select
          value={draft.expenseType}
          onChange={(event) => setDraft((current) => ({ ...current, expenseType: event.target.value }))}
        >
          {EXPENSE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          placeholder="Description"
          required
        />
        <input
          type="number"
          min="0"
          value={draft.amount}
          onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
          placeholder="Amount"
          required
        />
        <select
          value={draft.paidBy}
          onChange={(event) => setDraft((current) => ({ ...current, paidBy: event.target.value }))}
        >
          {STAFF_MEMBERS.map((staff) => (
            <option key={staff} value={staff}>
              {staff}
            </option>
          ))}
        </select>
        <button className="primary-button" type="submit">
          <Plus size={18} />
          Add
        </button>
      </form>

      <section className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses" />
        </label>
      </section>

      <section className="data-list">
        {visibleExpenses.length ? (
          visibleExpenses.map((expense) => (
            <article className="data-row" key={expense.id}>
              <div>
                <strong>{expense.description || expense.expenseType}</strong>
                <span>
                  {formatDate(expense.date)} - {expense.expenseType} - {expense.paidBy}
                </span>
              </div>
              <strong>{formatCurrency(expense.amount)}</strong>
              <button
                className="icon-button icon-button--danger"
                type="button"
                onClick={() => onDeleteExpense(expense.id)}
                title="Delete expense"
              >
                <Trash2 size={18} />
              </button>
            </article>
          ))
        ) : (
          <EmptyState title="No expenses found" detail="Add expenses as they are paid." />
        )}
      </section>
    </div>
  );
}
