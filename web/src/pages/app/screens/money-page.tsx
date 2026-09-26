import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, PiggyBank, Plus, Receipt, Trash2, Wallet, X } from 'lucide-react';
import { useState, type CSSProperties, type FormEvent } from 'react';

import type { TransactionType } from '@/domain/finance/entities';
import { formatMoney, toMinor } from '@/domain/finance/currency';
import { addMonths, formatMonthLabel, monthKeyOf } from '@/domain/finance/month';
import {
  useCategories,
  useCreateTransaction,
  useCurrency,
  useDeleteTransaction,
  useFinanceOverview,
  useMonthTotals,
  useMonthTransactions,
} from '@/features/finance/hooks';
import { habitPalette } from '@/theme/habit-palette';
import { todayIso } from '@/utils/date';

import { Button, Card, Dialog, IconButton, ProgressBar, Segmented, Skeleton } from '../../../components/ui';
import { useDocumentTitle } from '../../../lib/use-document-title';
import { dueLabel, EmptyState } from '../app-components';
import { confirmAction } from '../confirm';

export function MoneyPage() {
  useDocumentTitle('Money — ClayHabbit');
  const currency = useCurrency();
  const { data: overview, isLoading } = useFinanceOverview();
  const [month, setMonth] = useState(() => monthKeyOf(todayIso()));
  const { data: transactions } = useMonthTransactions(month);
  const { data: totals } = useMonthTotals(month);
  const remove = useDeleteTransaction();
  const [adding, setAdding] = useState(false);

  const money = (minor: number, sign?: 'always') => formatMoney(minor, currency, sign ? { sign } : {});

  if (isLoading || !overview) {
    return (
      <div className="page">
        <Skeleton height={200} radius={26} />
        <Skeleton height={320} radius={26} />
      </div>
    );
  }

  const summary = overview.summary;
  const budgets = overview.budgets;
  const categories = overview.categories;

  return (
    <div className="page">
      <div className="page__head">
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>Money</h1>
          <span className="t-body-md c-secondary">{formatMonthLabel(overview.monthKey)}</span>
        </div>
        <Button icon={<Plus size={20} strokeWidth={2.6} />} onClick={() => setAdding(true)}>
          Add transaction
        </Button>
      </div>

      <div className="grid-4">
        <Card style={{ minHeight: 160, background: 'var(--gradient-finance)', color: '#fff', borderColor: 'transparent' }}>
          <div className="stat">
            <span className="stat__label">Available</span>
            <span className="stat__value" style={{ fontSize: 32 }}>
              {money(overview.available)}
            </span>
            <span className="stat__hint">{overview.savedInPlans ? `${money(overview.savedInPlans)} set aside in savings` : 'Balance today'}</span>
          </div>
        </Card>
        <Card style={{ minHeight: 160 }}>
          <div className="stat">
            <span className="stat__label c-secondary">
              <ArrowDownLeft size={14} style={{ verticalAlign: -2 }} /> Money in
            </span>
            <span className="stat__value amount-in" style={{ fontSize: 30 }}>
              {money(summary.income)}
            </span>
            <span className="stat__hint c-secondary">this month</span>
          </div>
        </Card>
        <Card style={{ minHeight: 160 }}>
          <div className="stat">
            <span className="stat__label c-secondary">
              <ArrowUpRight size={14} style={{ verticalAlign: -2 }} /> Money out
            </span>
            <span className="stat__value" style={{ fontSize: 30 }}>
              {money(summary.expense)}
            </span>
            <span className="stat__hint c-secondary">
              {overview.spentSamePointLastMonth ? `${money(overview.spentSamePointLastMonth)} by now last month` : 'this month'}
            </span>
          </div>
        </Card>
        <Card tone={summary.net >= 0 ? 'lime' : undefined} style={{ minHeight: 160 }}>
          <div className="stat">
            <span className="stat__label">Net</span>
            <span className="stat__value" style={{ fontSize: 30 }}>
              {money(summary.net, 'always')}
            </span>
            <span className="stat__hint">{summary.net >= 0 ? 'You’re ahead this month' : 'Spending more than coming in'}</span>
          </div>
        </Card>
      </div>

      <div className="grid-main">
        <Card>
          <div className="section-head">
            <h2>Transactions</h2>
            <div className="row" style={{ gap: 6 }}>
              <IconButton label="Previous month" size="sm" onClick={() => setMonth((m) => addMonths(m, -1))}>
                <ChevronLeft size={18} />
              </IconButton>
              <span className="t-label-lg" style={{ width: 132, textAlign: 'center' }}>
                {formatMonthLabel(month)}
              </span>
              <IconButton label="Next month" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
                <ChevronRight size={18} />
              </IconButton>
            </div>
          </div>
          {totals ? (
            <div className="row row--wrap" style={{ gap: 8, marginBottom: 14 }}>
              <span className="chip">In {money(totals.income)}</span>
              <span className="chip">Out {money(totals.expense)}</span>
              {totals.saving ? <span className="chip">Saved {money(totals.saving)}</span> : null}
            </div>
          ) : null}
          {(transactions ?? []).length === 0 ? (
            <EmptyState icon={Receipt} title="Nothing recorded" body="Add what you spend and earn — it shows on your phone too." />
          ) : (
            <ul className="list">
              {(transactions ?? []).map((tx) => {
                const incoming = tx.type === 'income' || tx.type === 'withdrawal';
                const swatch = tx.category ? habitPalette[tx.category.color] : null;
                return (
                  <li key={tx.id} className="item">
                    <span
                      className="habit__glyph"
                      style={{ width: 42, height: 42, fontSize: 20, borderRadius: 14, background: swatch ? `linear-gradient(135deg, ${swatch.gradient[0]}, ${swatch.gradient[1]})` : 'var(--color-surface-muted)' }}
                      aria-hidden
                    >
                      {tx.category?.emoji ?? tx.savingsPlan?.emoji ?? (incoming ? '💰' : '🧾')}
                    </span>
                    <div className="item__body">
                      <span className="item__title">{tx.merchant || tx.category?.name || tx.savingsPlan?.name || tx.type}</span>
                      <span className="item__meta">
                        <span>{dueLabel(tx.occurredOn)}</span>
                        {tx.category && tx.merchant ? <span>{tx.category.name}</span> : null}
                        {tx.note ? <span>{tx.note}</span> : null}
                      </span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <span className={`t-title-md num ${incoming ? 'amount-in' : 'amount-out'}`}>
                        {incoming ? '+' : '−'}
                        {money(tx.amountMinor)}
                      </span>
                      <div className="item__actions">
                        <IconButton
                          label="Delete transaction"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (await confirmAction({ title: 'Delete this transaction?', confirmLabel: 'Delete', danger: true })) remove.mutate(tx.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="stack">
          <Card>
            <div className="section-head">
              <h2>Budgets</h2>
              <span className="t-label-md c-tertiary">Set them on your phone</span>
            </div>
            {!budgets.overall && budgets.lines.length === 0 ? (
              <p className="t-body-sm c-secondary">No budgets yet. Budgets you set in the app show here with how much is left.</p>
            ) : (
              <div className="stack-sm">
                {[...(budgets.overall ? [budgets.overall] : []), ...budgets.lines].map((line) => {
                  const over = line.usage.remainingMinor < 0;
                  return (
                    <div key={line.scope} style={{ display: 'grid', gap: 6 }}>
                      <div className="row row--between">
                        <span className="t-label-lg">
                          {line.emoji} {line.categoryId ? line.name : 'Whole month'}
                        </span>
                        <span className="t-label-md num" style={{ color: over ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                          {over ? `${money(-line.usage.remainingMinor)} over` : `${money(line.usage.remainingMinor)} left`}
                        </span>
                      </div>
                      <ProgressBar
                        value={Number.isFinite(line.usage.ratio) ? line.usage.ratio : 1}
                        color={over ? 'var(--color-error)' : line.usage.ratio > 0.85 ? 'var(--color-warning)' : 'var(--color-finance)'}
                        label={`${line.name} budget`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <div className="section-head">
              <h2>Where it went</h2>
            </div>
            {categories.items.length === 0 ? (
              <p className="t-body-sm c-secondary">Spending by category shows here.</p>
            ) : (
              <div className="stack-sm">
                {categories.items.map((item) => (
                  <div key={item.categoryId ?? item.name} style={{ display: 'grid', gap: 6 }}>
                    <div className="row row--between">
                      <span className="t-label-lg">
                        {item.emoji} {item.name}
                      </span>
                      <span className="t-label-md c-secondary num">
                        {money(item.totalMinor)} · {Math.round(item.share * 100)}%
                      </span>
                    </div>
                    <div className="bar">
                      <span style={{ '--value': item.share, background: habitPalette[item.color]?.base } as CSSProperties} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {overview.plans.length ? (
            <Card>
              <div className="section-head">
                <h2>Savings</h2>
                <PiggyBank size={18} />
              </div>
              <div className="stack-sm">
                {overview.plans.map((plan) => (
                  <div key={plan.id} style={{ display: 'grid', gap: 6 }}>
                    <div className="row row--between">
                      <span className="t-label-lg">
                        {plan.emoji} {plan.name}
                      </span>
                      <span className="t-label-md c-secondary num">
                        {money(plan.savedMinor)} / {money(plan.targetMinor)}
                      </span>
                    </div>
                    <ProgressBar value={plan.targetMinor ? plan.savedMinor / plan.targetMinor : 0} color={habitPalette[plan.color]?.base} label={`${plan.name} saved`} />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog open={adding} onClose={() => setAdding(false)} labelledBy="tx-title">
        {adding ? <TransactionForm onClose={() => setAdding(false)} /> : null}
      </Dialog>
    </div>
  );
}

const TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

function TransactionForm({ onClose }: { onClose: () => void }) {
  const currency = useCurrency();
  const [type, setType] = useState<Extract<TransactionType, 'expense' | 'income'>>('expense');
  const { data: categories } = useCategories(type);
  const create = useCreateTransaction();
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');

  const value = Number(amount.replace(/,/g, ''));
  const valid = Number.isFinite(value) && value > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    await create.mutateAsync({
      type,
      amountMinor: toMinor(value),
      categoryId: categoryId || null,
      occurredOn: date,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
    });
    onClose();
  };

  return (
    <form className="dialog__body" onSubmit={submit}>
      <div className="row row--between">
        <h2 id="tx-title" className="t-headline-md">
          Add transaction
        </h2>
        <IconButton label="Close" variant="ghost" size="sm" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
      <Segmented
        label="Type"
        options={TYPES}
        value={type}
        onChange={(next) => {
          setType(next);
          setCategoryId('');
        }}
      />
      <label className="field">
        <span className="field__label">Amount ({currency})</span>
        <input
          className="input num"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder="0"
          autoFocus
          style={{ fontSize: 28, fontWeight: 800, height: 64 }}
        />
      </label>
      <div className="grid-2">
        <label className="field">
          <span className="field__label">Category</span>
          <select className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">No category</option>
            {(categories ?? [])
              .filter((category) => !category.isArchived)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Date</span>
          <input className="input" type="date" value={date} max={todayIso()} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span className="field__label">{type === 'expense' ? 'Where (optional)' : 'From (optional)'}</span>
        <input className="input" value={merchant} onChange={(event) => setMerchant(event.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Note (optional)</span>
        <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="dialog__actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={<Wallet size={18} />} disabled={!valid} loading={create.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
