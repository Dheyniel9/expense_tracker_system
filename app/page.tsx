'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'

type TransactionType = 'add' | 'expense'
type SourceOfFunds = 'fund' | 'personal'

type Transaction = {
  id: number
  type: TransactionType
  source_of_funds: SourceOfFunds
  description: string
  amount: number
  user_name: string
  transaction_date: string | null
  created_at: string
}

type TransactionRow = {
  id: number
  type: string
  source_of_funds: string | null
  description: string
  amount: number
  user_name: string
  transaction_date: string | null
  created_at: string
}

const transactionTypes: TransactionType[] = ['add', 'expense']
const sourceOfFundsOptions: SourceOfFunds[] = ['fund', 'personal']
const USERS = ['Czar', 'Jem', 'Ronz', 'Rich']
const isTransactionType = (value: string): value is TransactionType =>
  transactionTypes.includes(value as TransactionType)
const isSourceOfFunds = (value: string): value is SourceOfFunds =>
  sourceOfFundsOptions.includes(value as SourceOfFunds)
const getTodayDate = () => new Date().toISOString().slice(0, 10)
const APP_PASSWORD = 'bjjc'
const AUTH_STORAGE_KEY = 'jbbc_fund_tracker_unlocked'

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2
  }).format(value)

const formatDateOnly = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(new Date(value))

const getTransactionDateKey = (transaction: Transaction) =>
  (transaction.transaction_date || transaction.created_at).slice(0, 10)

const parseTransactions = (rows: TransactionRow[]): Transaction[] =>
  rows.reduce<Transaction[]>((acc, item) => {
    if (!isTransactionType(item.type)) return acc
    const rawSource = item.source_of_funds ?? ''

    acc.push({
      ...item,
      type: item.type,
      source_of_funds: isSourceOfFunds(rawSource) ? rawSource : 'fund'
    })

    return acc
  }, [])

const getReimbursedPersonalIds = (items: Transaction[]) =>
  items.reduce<Set<number>>((acc, transaction) => {
    if (transaction.type !== 'expense' || transaction.source_of_funds !== 'fund') return acc

    const match = transaction.description.match(/\[REIMBURSE:(\d+)\]/)
    if (!match) return acc

    acc.add(Number(match[1]))
    return acc
  }, new Set<number>())

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [type, setType] = useState<TransactionType>('add')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState(0)
  const [user, setUser] = useState('')
  const [sourceOfFunds, setSourceOfFunds] = useState<SourceOfFunds>('fund')
  const [transactionDate, setTransactionDate] = useState(getTodayDate())
  const [isSaving, setIsSaving] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [nameFilter, setNameFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | SourceOfFunds>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [isReimbursingId, setIsReimbursingId] = useState<number | null>(null)
  const [reimburseMessage, setReimburseMessage] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
    setIsUnlocked(stored === '1')
    setAuthReady(true)
  }, [])

  // FETCH DATA
  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, source_of_funds, description, amount, user_name, transaction_date, created_at')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        setFetchError('Unable to load transactions. Please refresh.')
        return
      }

      const parsed = parseTransactions((data ?? []) as TransactionRow[])

      setTransactions(parsed)
      setFetchError('')
    } catch {
      setFetchError('Unable to load transactions. Please refresh.')
    }
  }

  useEffect(() => {
    if (!isUnlocked) return
    fetchTransactions()
  }, [isUnlocked])

  // ADD TRANSACTION
  const addTransaction = async () => {
    if (isSaving) return

    const normalizedDesc = desc.trim()
    const normalizedUser = user.trim()

    if (!normalizedDesc || !normalizedUser) {
      setFormError('Description and name are required.')
      setFormSuccess('')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount must be greater than 0.')
      setFormSuccess('')
      return
    }

    if (!transactionDate) {
      setFormError('Transaction date is required.')
      setFormSuccess('')
      return
    }

    setIsSaving(true)
    setFormError('')
    setFormSuccess('')

    try {
      const { error } = await supabase.from('transactions').insert({
        type,
        source_of_funds: sourceOfFunds,
        description: normalizedDesc,
        amount,
        user_name: normalizedUser,
        transaction_date: transactionDate
      })

      if (error) {
        setFormError('Unable to save transaction. Please try again.')
        return
      }

      setDesc('')
      setAmount(0)
      setUser('')
      setType('add')
      setSourceOfFunds('fund')
      setTransactionDate(getTodayDate())
      setFormSuccess('Transaction saved.')

      await fetchTransactions()
    } catch {
      setFormError('Unable to save transaction. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const reimbursedPersonalIds = useMemo(
    () => getReimbursedPersonalIds(transactions),
    [transactions]
  )

  const { balance, totalAdded, totalExpense, personalExpenseTotal, outstandingPersonalTotal, reimbursedPersonalTotal } =
    useMemo(() => {
      const computedBalance = transactions.reduce((sum, transaction) => {
        if (transaction.source_of_funds !== 'fund') return sum
        if (transaction.type === 'add') return sum + transaction.amount
        if (transaction.type === 'expense') return sum - transaction.amount
        return sum
      }, 0)

      const computedTotalAdded = transactions.reduce((sum, transaction) => {
        if (transaction.type === 'add' && transaction.source_of_funds === 'fund') return sum + transaction.amount
        return sum
      }, 0)

      const computedTotalExpense = transactions.reduce((sum, transaction) => {
        if (transaction.type === 'expense' && transaction.source_of_funds === 'fund') return sum + transaction.amount
        return sum
      }, 0)

      const computedPersonalExpenseTotal = transactions.reduce((sum, transaction) => {
        if (transaction.type === 'expense' && transaction.source_of_funds === 'personal') return sum + transaction.amount
        return sum
      }, 0)

      const computedOutstandingPersonalTotal = transactions.reduce((sum, transaction) => {
        if (transaction.type !== 'expense' || transaction.source_of_funds !== 'personal') return sum
        if (reimbursedPersonalIds.has(transaction.id)) return sum
        return sum + transaction.amount
      }, 0)

      return {
        balance: computedBalance,
        totalAdded: computedTotalAdded,
        totalExpense: computedTotalExpense,
        personalExpenseTotal: computedPersonalExpenseTotal,
        outstandingPersonalTotal: computedOutstandingPersonalTotal,
        reimbursedPersonalTotal: computedPersonalExpenseTotal - computedOutstandingPersonalTotal
      }
    }, [transactions, reimbursedPersonalIds])

  const onTypeChange = (nextType: string) => {
    if (isTransactionType(nextType)) {
      setType(nextType)
    }
  }

  const typeBadgeClass: Record<TransactionType, string> = {
    add: 'bg-emerald-100 text-emerald-800',
    expense: 'bg-rose-100 text-rose-800'
  }

  const sourceBadgeClass: Record<SourceOfFunds, string> = {
    fund: 'bg-sky-100 text-sky-800',
    personal: 'bg-violet-100 text-violet-800'
  }

  const availableUsers = useMemo(
    () => Array.from(new Set([...USERS, ...transactions.map((transaction) => transaction.user_name)])),
    [transactions]
  )

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const matchesName = nameFilter === 'all' || transaction.user_name === nameFilter
        const matchesType = typeFilter === 'all' || transaction.type === typeFilter
        const matchesSource = sourceFilter === 'all' || transaction.source_of_funds === sourceFilter
        const matchesDate = !dateFilter || getTransactionDateKey(transaction) === dateFilter

        return matchesName && matchesType && matchesSource && matchesDate
      }),
    [transactions, nameFilter, typeFilter, sourceFilter, dateFilter]
  )

  const clearFilters = () => {
    setNameFilter('all')
    setTypeFilter('all')
    setSourceFilter('all')
    setDateFilter('')
  }

  const markPersonalExpenseAsReimbursed = async (transaction: Transaction) => {
    if (isReimbursingId) return
    if (reimbursedPersonalIds.has(transaction.id)) return

    setIsReimbursingId(transaction.id)
    setReimburseMessage('')

    try {
      const { error } = await supabase.from('transactions').insert({
        type: 'expense',
        source_of_funds: 'fund',
        description: `[REIMBURSE:${transaction.id}] Reimbursement to ${transaction.user_name}: ${transaction.description}`,
        amount: transaction.amount,
        user_name: transaction.user_name,
        transaction_date: getTodayDate()
      })

      if (error) {
        setReimburseMessage('Unable to mark as reimbursed. Please try again.')
        return
      }

      setReimburseMessage('Personal expense marked as reimbursed.')
      await fetchTransactions()
    } catch {
      setReimburseMessage('Unable to mark as reimbursed. Please try again.')
    } finally {
      setIsReimbursingId(null)
    }
  }

  const unlockSystem = () => {
    if (passwordInput !== APP_PASSWORD) {
      setAuthError('Incorrect password.')
      return
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, '1')
    setIsUnlocked(true)
    setPasswordInput('')
    setAuthError('')
  }

  const lockSystem = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setIsUnlocked(false)
    setPasswordInput('')
    setAuthError('')
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-sm text-slate-600">Loading...</p>
      </main>
    )
  }

  if (!isUnlocked) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(251,191,36,0.28),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(6,182,212,0.2),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.15),transparent_40%)]" />
        <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">BJJC</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">System Locked</h1>
          <p className="mt-2 text-sm text-slate-600">Enter password to access the fund tracker.</p>

          {authError ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{authError}</p>
          ) : null}

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Password</span>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') unlockSystem()
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <button
              onClick={unlockSystem}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 mt-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Unlock
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-slate-100 px-2 py-5 sm:px-3 lg:px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(251,191,36,0.3),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(6,182,212,0.2),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.2),transparent_40%)]" />

      <div className="relative w-full space-y-4">
        <header className="animate-rise rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-700 text-lg font-black text-white shadow-sm">
                B
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">BJJC</p>
                <p className="text-2xl font-black leading-tight text-slate-900">Fund Tracker</p>
              </div>
            </div>
            <div className="space-y-1.5 text-right">
              <Link
                href="/product-calculation"
                className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700"
              >
                Product Calculation
              </Link>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Funds balance</p>
                <p className={`text-2xl font-black ${balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatAmount(balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-5">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Total Added</p>
              <p className="text-lg font-extrabold text-emerald-800">{formatAmount(totalAdded)}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-800">Fund Expense</p>
              <p className="text-lg font-extrabold text-rose-800">{formatAmount(totalExpense)}</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">Personal Outstanding</p>
              <p className="text-lg font-extrabold text-violet-800">{formatAmount(outstandingPersonalTotal)}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Personal Reimbursed</p>
              <p className="text-lg font-extrabold text-amber-800">{formatAmount(reimbursedPersonalTotal)}</p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">Entries</p>
              <p className="text-lg font-extrabold text-sky-800">{transactions.length}</p>
            </div>
          </div>

          <div className="mt-2">
            {outstandingPersonalTotal === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                All personal funds are fully paid.
              </p>
            ) : (
              <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
                Personal reimbursement pending: {formatAmount(outstandingPersonalTotal)}
              </p>
            )}
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="animate-rise rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-4">
            <h2 className="text-lg font-bold text-slate-900">Add Transaction</h2>
            <p className="mt-1 text-sm text-slate-600">Quickly record contributions and expenses.</p>

            {formError ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
            ) : null}
            {formSuccess ? (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{formSuccess}</p>
            ) : null}

            <div className="mt-3 space-y-2.5">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Type</span>
                <select
                  value={type}
                  onChange={(e) => onTypeChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  {transactionTypes.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</span>
                <input
                  placeholder="Binili ko kay ..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Name</span>
                <select value={user} onChange={(e) => setUser(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                  <option value="">Select name</option>
                  {USERS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>

              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Source of funds</span>
                <select
                  value={sourceOfFunds}
                  onChange={(e) => {
                    if (isSourceOfFunds(e.target.value)) {
                      setSourceOfFunds(e.target.value)
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  {sourceOfFundsOptions.map((source) => (
                    <option key={source} value={source}>
                      {source === 'fund' ? 'Fund' : 'Personal'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Transaction date</span>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <button
                onClick={addTransaction}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving || !desc.trim() || !amount || !user.trim() || !transactionDate}
              >
                {isSaving ? 'Saving...' : 'Save transaction'}
              </button>
            </div>
          </div>

          <div className="animate-rise rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Transaction Ledger</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {filteredTransactions.length} of {transactions.length} record{transactions.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Name</span>
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="all">All names</option>
                  {availableUsers.map((memberName) => (
                    <option key={memberName} value={memberName}>
                      {memberName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Type</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="all">All types</option>
                  {transactionTypes.map((transactionType) => (
                    <option key={transactionType} value={transactionType}>
                      {transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Source</span>
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'all' || isSourceOfFunds(value)) {
                      setSourceFilter(value as 'all' | SourceOfFunds)
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="all">All sources</option>
                  {sourceOfFundsOptions.map((source) => (
                    <option key={source} value={source}>
                      {source === 'fund' ? 'Fund' : 'Personal'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">Date</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {fetchError ? (
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{fetchError}</p>
            ) : null}

            {reimburseMessage ? (
              <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{reimburseMessage}</p>
            ) : null}

            {filteredTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                {transactions.length === 0
                  ? 'No transactions yet. Add your first entry using the form.'
                  : 'No matching records for your current filters.'}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="hidden grid-cols-[1.1fr_0.8fr_0.65fr_0.75fr_1fr] gap-2 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:grid">
                  <p>Description</p>
                  <p>Member</p>
                  <p>Type</p>
                  <p>Source</p>
                  <p className="text-right">Amount / Date</p>
                </div>
                <ul className="divide-y divide-slate-200">
                  {filteredTransactions.map((t, index) => (
                    <li
                      key={t.id}
                      className="grid grid-cols-1 gap-1 bg-white px-3 py-2.5 text-sm sm:grid-cols-[1.1fr_0.8fr_0.65fr_0.75fr_1fr] sm:items-center sm:gap-2"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <p className="font-semibold text-slate-900">{t.description}</p>
                      <p className="text-slate-600">{t.user_name}</p>
                      <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${typeBadgeClass[t.type]}`}>
                        {t.type}
                      </span>
                      <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${sourceBadgeClass[t.source_of_funds]}`}>
                        {t.source_of_funds}
                      </span>
                      <div className="text-left sm:text-right">
                        <p className="font-bold text-slate-900">{formatAmount(t.amount)}</p>
                        <p className="text-xs text-slate-500">{formatDateOnly(t.transaction_date || t.created_at)}</p>
                        {t.type === 'expense' && t.source_of_funds === 'personal' ? (
                          reimbursedPersonalIds.has(t.id) ? (
                            <span className="mt-1 inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                              Reimbursed
                            </span>
                          ) : (
                            <button
                              onClick={() => markPersonalExpenseAsReimbursed(t)}
                              disabled={isReimbursingId === t.id}
                              className="mt-1 inline-flex rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isReimbursingId === t.id ? 'Saving...' : 'Mark Paid'}
                            </button>
                          )
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
