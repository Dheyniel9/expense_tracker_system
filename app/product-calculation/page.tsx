'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type Product = {
  key: string
  label: string
  originalPrice: number
  adjustedPrice: number
}

const products: Product[] = [
  { key: 'A5', label: 'A5', originalPrice: 1200, adjustedPrice: 950 },
  { key: 'A4', label: 'A4', originalPrice: 1100, adjustedPrice: 700 },
  { key: 'A3', label: 'A3', originalPrice: 600, adjustedPrice: 350 },
  { key: 'A2', label: 'A2', originalPrice: 350, adjustedPrice: 200 },
  { key: 'A_PLUS', label: 'A+', originalPrice: 250, adjustedPrice: 135 },
  { key: 'A_MINUS', label: 'A-', originalPrice: 120, adjustedPrice: 70 },
  { key: 'NC_512', label: 'NC 512', originalPrice: 1100, adjustedPrice: 1100 },
  { key: 'NC_256', label: 'NC 256', originalPrice: 1100, adjustedPrice: 750 },
  { key: 'NC_128', label: 'NC 128', originalPrice: 1000, adjustedPrice: 600 },
  { key: 'NC_64', label: 'NC 64', originalPrice: 600, adjustedPrice: 330 },
  { key: 'NC_32', label: 'NC 32', originalPrice: 300, adjustedPrice: 180 },
  { key: 'NC_16', label: 'NC 16', originalPrice: 200, adjustedPrice: 70 },
  { key: 'IOS', label: 'IOS', originalPrice: 140, adjustedPrice: 70 }


]

const currency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2
  }).format(value)

export default function ProductCalculationPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.key, 0]))
  )
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.key, p.originalPrice]))
  )
  const [adjustedPrices, setAdjustedPrices] = useState<Record<string, number>>(
    Object.fromEntries(products.map((p) => [p.key, p.adjustedPrice]))
  )

  const rows = useMemo(
    () =>
      products.map((product) => {
        const qty = quantities[product.key] ?? 0
        const originalPrice = originalPrices[product.key] ?? product.originalPrice
        const adjustedPrice = adjustedPrices[product.key] ?? product.adjustedPrice
        const originalSubtotal = qty * originalPrice
        const adjustedSubtotal = qty * adjustedPrice

        return {
          ...product,
          originalPrice,
          adjustedPrice,
          qty,
          originalSubtotal,
          adjustedSubtotal,
          difference: originalSubtotal - adjustedSubtotal
        }
      }),
    [adjustedPrices, originalPrices, quantities]
  )

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.quantity += row.qty
        acc.original += row.originalSubtotal
        acc.adjusted += row.adjustedSubtotal
        acc.difference += row.difference
        return acc
      },
      { quantity: 0, original: 0, adjusted: 0, difference: 0 }
    )
  }, [rows])

  const updateQty = (key: string, rawValue: string) => {
    const parsed = Number(rawValue)
    const nextValue = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0

    setQuantities((prev) => ({
      ...prev,
      [key]: nextValue
    }))
  }

  const updateAdjustedPrice = (key: string, rawValue: string) => {
    const parsed = Number(rawValue)
    const nextValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0

    setAdjustedPrices((prev) => ({
      ...prev,
      [key]: nextValue
    }))
  }

  const updateOriginalPrice = (key: string, rawValue: string) => {
    const parsed = Number(rawValue)
    const nextValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0

    setOriginalPrices((prev) => ({
      ...prev,
      [key]: nextValue
    }))
  }

  const resetAll = () => {
    setQuantities(Object.fromEntries(products.map((p) => [p.key, 0])))
    setOriginalPrices(Object.fromEntries(products.map((p) => [p.key, p.originalPrice])))
    setAdjustedPrices(Object.fromEntries(products.map((p) => [p.key, p.adjustedPrice])))
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">BJJC</p>
              <h1 className="text-2xl font-black text-slate-900">Product Calculation</h1>
              <p className="mt-1 text-sm text-slate-600">Enter quantity per product and totals calculate automatically.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetAll}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Reset
              </button>
              <Link
                href="/"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Quantity</p>
            <p className="text-2xl font-black text-slate-900">{totals.quantity}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Original Total</p>
            <p className="text-2xl font-black text-emerald-800">{currency(totals.original)}</p>
          </div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Adjusted Total</p>
            <p className="text-2xl font-black text-cyan-800">{currency(totals.adjusted)}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Difference</p>
            <p className="text-2xl font-black text-amber-800">{currency(totals.difference)}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-6 gap-2 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <p>Product</p>
            <p>Qty</p>
            <p className="text-right">Original Price</p>
            <p className="text-right">Adjusted Price</p>
            <p className="text-right">Adjusted Subtotal</p>
            <p className="text-right">Difference</p>
          </div>

          <ul className="divide-y divide-slate-200">
            {rows.map((row) => (
              <li key={row.key} className="grid grid-cols-1 gap-2 px-4 py-3 text-sm sm:grid-cols-6 sm:items-center">
                <p className="font-semibold text-slate-900">{row.label}</p>
                <input
                  type="number"
                  min={0}
                  value={row.qty || ''}
                  onChange={(e) => updateQty(row.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="0"
                />
                <input
                  type="number"
                  min={0}
                  value={row.originalPrice || ''}
                  onChange={(e) => updateOriginalPrice(row.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-right outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="0"
                />
                <input
                  type="number"
                  min={0}
                  value={row.adjustedPrice || ''}
                  onChange={(e) => updateAdjustedPrice(row.key, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-right outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  placeholder="0"
                />
                <p className="text-left font-semibold text-cyan-700 sm:text-right">{currency(row.adjustedSubtotal)}</p>
                <p className="text-left font-semibold text-amber-700 sm:text-right">{currency(row.difference)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
