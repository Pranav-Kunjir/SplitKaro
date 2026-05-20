"use client"

import { createClient } from "@/lib/supabase/client"
import { ReceiptText, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

type Expense = {
  id: string
  created_at: string
  chat_id: string | null
  paid_by: string | null
  title: string | null
  amount: number | string | null
  category: string | null
  note: string | null
}

type ExpenseSplit = {
  id: string
  user_id: string | null
  is_paid: boolean | null
  amount: number | string | null
}

type User = {
  id: string
  name: string | null
  email: string | null
}

type SplitWithUser = ExpenseSplit & {
  label: string
}

type ExpenseCardProps = {
  expense: Expense
  currentUserId: string | null
}

function formatAmount(amount: number | string | null) {
  const value = Number(amount)

  if (!Number.isFinite(value)) return "Rs. 0.00"

  return `Rs. ${value.toFixed(2)}`
}

export default function ExpenseCard({
  expense,
  currentUserId,
}: ExpenseCardProps) {
  const [open, setOpen] = useState(false)
  const [splits, setSplits] = useState<SplitWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)

  const currentUserSplit = useMemo(
    () => splits.find((split) => split.user_id === currentUserId),
    [currentUserId, splits]
  )

  const pendingAmount = currentUserSplit?.is_paid
    ? null
    : currentUserSplit?.amount

  const fetchSplits = useCallback(async () => {
    setLoading(true)

    const supabase = createClient()

    const { data: splitRows, error: splitError } = await supabase
      .from("expense_splits")
      .select("id, user_id, is_paid, amount")
      .eq("expense_id", expense.id)

    if (splitError) {
      console.error("Error fetching expense splits:", splitError)
      setLoading(false)
      return
    }

    const rows = (splitRows || []) as ExpenseSplit[]
    const userIds = rows
      .map((split) => split.user_id)
      .filter((userId): userId is string => Boolean(userId))

    if (userIds.length === 0) {
      setSplits([])
      setLoading(false)
      return
    }

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", userIds)

    if (usersError) {
      console.error("Error fetching split users:", usersError)
    }

    const usersById = new Map(
      ((users || []) as User[]).map((user) => [user.id, user])
    )

    setSplits(
      rows.map((split) => {
        const user = split.user_id ? usersById.get(split.user_id) : null

        return {
          ...split,
          label:
            user?.name ||
            user?.email ||
            split.user_id ||
            "Unknown member",
        }
      })
    )
    setLoading(false)
  }, [expense.id])

  useEffect(() => {
    if (!open) return

    fetchSplits()
  }, [fetchSplits, open])

  async function paySplit() {
    if (!currentUserSplit) return

    setPaying(true)

    const supabase = createClient()

    const { error } = await supabase
      .from("expense_splits")
      .update({ is_paid: true })
      .eq("id", currentUserSplit.id)

    if (error) {
      console.error("Error paying expense split:", error)
      setPaying(false)
      return
    }

    setSplits((currentSplits) =>
      currentSplits.map((split) =>
        split.id === currentUserSplit.id
          ? { ...split, is_paid: true }
          : split
      )
    )
    setPaying(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="max-w-[70%] rounded-xl border bg-background px-4 py-3 text-left shadow-sm transition hover:bg-muted"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
            <ReceiptText size={18} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {expense.title || "Expense"}
            </p>
            <p className="text-lg font-semibold">
              {formatAmount(expense.amount)}
            </p>
            {expense.note && (
              <p className="truncate text-xs text-muted-foreground">
                {expense.note}
              </p>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">
                  {expense.title || "Expense"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {formatAmount(expense.amount)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-muted transition"
                aria-label="Close expense details"
              >
                <X size={20} />
              </button>
            </div>

            {expense.note && (
              <p className="mb-4 rounded-xl border p-3 text-sm">
                {expense.note}
              </p>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Payment Details
              </h3>

              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border p-2">
                {loading ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    Loading payment details...
                  </p>
                ) : splits.length > 0 ? (
                  splits.map((split) => (
                    <div
                      key={split.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {split.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {split.is_paid ? "Paid" : "Remaining"}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-medium">
                        {formatAmount(split.amount)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="p-2 text-sm text-muted-foreground">
                    No split details found.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border px-4 py-2 hover:bg-muted transition"
              >
                Close
              </button>

              {currentUserSplit && !currentUserSplit.is_paid && (
                <button
                  type="button"
                  onClick={paySplit}
                  disabled={paying}
                  className="rounded-xl bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
                >
                  {paying
                    ? "Paying..."
                    : `Pay ${formatAmount(pendingAmount ?? 0)}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
