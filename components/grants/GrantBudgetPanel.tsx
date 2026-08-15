'use client';

import { useState, useTransition } from 'react';
import { ReceiptText, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  addGrantBudgetLineAction,
  updateGrantBudgetLineAction,
  deleteGrantBudgetLineAction,
  logGrantExpenseAction,
  updateGrantExpenseAction,
  deleteGrantExpenseAction,
  type ActionState,
} from '@/lib/actions/grant-budget';

export type ExpenseRow = { id: string; amount: number; date: string; description: string | null };
export type BudgetLineRow = {
  id: string;
  name: string;
  budgetedAmount: number;
  expenses: ExpenseRow[];
};

function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export default function GrantBudgetPanel({
  grantId,
  grantOpportunityId,
  budgetLines,
  canEdit,
}: {
  grantId: string;
  grantOpportunityId: string;
  budgetLines: BudgetLineRow[];
  canEdit: boolean;
}) {
  const [showAddLine, setShowAddLine] = useState(false);
  const [expenseFormLineId, setExpenseFormLineId] = useState<string | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalBudgeted = budgetLines.reduce((sum, l) => sum + l.budgetedAmount, 0);
  const totalSpent = budgetLines.reduce(
    (sum, l) => sum + l.expenses.reduce((s, e) => s + e.amount, 0),
    0,
  );
  const overallPct = totalBudgeted > 0 ? Math.min(100, (totalSpent / totalBudgeted) * 100) : 0;

  function handleAddLine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('grantId', grantId);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await addGrantBudgetLineAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setShowAddLine(false);
    });
  }

  function handleDeleteLine(id: string) {
    if (!confirm('Remove this budget line? Any logged expenses against it will be removed too.')) return;
    const formData = new FormData();
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await deleteGrantBudgetLineAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  function handleUpdateLine(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await updateGrantBudgetLineAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setEditingLineId(null);
    });
  }

  function handleUpdateExpense(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await updateGrantExpenseAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setEditingExpenseId(null);
    });
  }

  function handleLogExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!expenseFormLineId) return;
    const formData = new FormData(e.currentTarget);
    formData.set('budgetLineId', expenseFormLineId);
    formData.set('grantOpportunityId', grantOpportunityId);
    setError(null);
    startTransition(async () => {
      const result: ActionState = await logGrantExpenseAction(undefined, formData);
      if (result?.error) setError(result.error);
      else setExpenseFormLineId(null);
    });
  }

  function handleDeleteExpense(id: string) {
    if (!confirm('Remove this expense?')) return;
    const formData = new FormData();
    formData.set('id', id);
    formData.set('grantOpportunityId', grantOpportunityId);
    startTransition(async () => {
      const result: ActionState = await deleteGrantExpenseAction(undefined, formData);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className="rounded-[16px] border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReceiptText size={16} className="text-gray-900" />
          <h2 className="text-[15px] font-bold text-gray-900">Budget and expenses</h2>
        </div>
        <span className="text-[12px] text-gray-500">
          {formatCurrency(totalSpent)} of {formatCurrency(totalBudgeted)} spent
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-evergreen" style={{ width: `${overallPct}%` }} />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {budgetLines.length === 0 && !showAddLine && (
          <p className="text-sm text-gray-600">No budget lines tracked yet.</p>
        )}
        {budgetLines.map((line) => {
          const spent = line.expenses.reduce((s, e) => s + e.amount, 0);
          const pct = line.budgetedAmount > 0 ? (spent / line.budgetedAmount) * 100 : 0;
          const overBudget = spent > line.budgetedAmount;

          return (
            <div
              key={line.id}
              className={`rounded-xl border p-3.5 ${overBudget ? 'border-error/30 bg-error/5' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                {editingLineId === line.id ? (
                  <form
                    onSubmit={(e) => handleUpdateLine(e, line.id)}
                    className="flex flex-1 items-center gap-2"
                  >
                    <input
                      name="name"
                      required
                      defaultValue={line.name}
                      className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13.5px] font-semibold"
                    />
                    <input
                      name="budgetedAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={line.budgetedAmount}
                      className="w-28 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                    />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-lg bg-evergreen px-2.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLineId(null)}
                      className="text-[12px] text-gray-500"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="text-[14px] font-semibold text-gray-900">{line.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] ${overBudget ? 'font-semibold text-error' : 'text-gray-500'}`}>
                        {formatCurrency(spent)} of {formatCurrency(line.budgetedAmount)}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditingLineId(line.id)}
                          className="text-gray-300 hover:text-evergreen"
                          aria-label="Edit budget line"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${overBudget ? 'bg-error' : 'bg-evergreen'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              {overBudget && (
                <p className="mt-1.5 text-xs font-semibold text-error">
                  Over budget by {formatCurrency(spent - line.budgetedAmount)}
                </p>
              )}

              {line.expenses.length > 0 && (
                <div className="mt-3 flex flex-col divide-y divide-gray-50 border-t border-gray-50 pt-2">
                  {line.expenses.map((exp) =>
                    editingExpenseId === exp.id ? (
                      <form
                        key={exp.id}
                        onSubmit={(e) => handleUpdateExpense(e, exp.id)}
                        className="flex flex-col gap-2 py-2"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            name="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            defaultValue={exp.amount}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                          />
                          <input
                            name="date"
                            type="date"
                            required
                            defaultValue={toDateInputValue(exp.date)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                          />
                        </div>
                        <input
                          name="description"
                          defaultValue={exp.description ?? ''}
                          placeholder="Description (optional)"
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-evergreen px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingExpenseId(null)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div key={exp.id} className="flex items-center justify-between py-1.5 text-[12.5px]">
                        <span className="text-gray-600">
                          {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {exp.description ? ` · ${exp.description}` : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{formatCurrency(exp.amount)}</span>
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingExpenseId(exp.id)}
                                className="text-gray-300 hover:text-evergreen"
                                aria-label="Edit expense"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-gray-300 hover:text-error"
                                aria-label="Remove expense"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}

              {canEdit && (
                <>
                  {expenseFormLineId === line.id ? (
                    <form onSubmit={handleLogExpense} className="mt-3 flex flex-col gap-2 border-t border-gray-50 pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="Amount"
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                        />
                        <input
                          name="date"
                          type="date"
                          required
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                        />
                      </div>
                      <input
                        name="description"
                        placeholder="Description (optional)"
                        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded-lg bg-evergreen px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
                        >
                          Log
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseFormLineId(null)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-semibold text-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLine(line.id)}
                          className="ml-auto text-[12px] text-gray-400 hover:text-error"
                        >
                          Remove line
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setExpenseFormLineId(line.id)}
                      className="mt-3 text-[12.5px] font-semibold text-evergreen hover:text-[#0d685f]"
                    >
                      + Log expense
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs font-medium text-error">{error}</p>}

      {canEdit && (
        <>
          {showAddLine ? (
            <form onSubmit={handleAddLine} className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-50 p-4">
              <input
                name="name"
                required
                placeholder="Program staff salaries"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                name="budgetedAmount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Budgeted amount"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-evergreen px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLine(false)}
                  className="rounded-lg border border-gray-200 px-3.5 py-2 text-[13px] font-semibold text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddLine(true)}
              className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-evergreen hover:text-[#0d685f]"
            >
              <Plus size={14} />
              Add budget line
            </button>
          )}
        </>
      )}
    </div>
  );
}
