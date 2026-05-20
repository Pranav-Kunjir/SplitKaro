"use client";

import { createClient } from "@/lib/supabase/client";
import { ReceiptIndianRupee, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CreateExpenseButtonProps = {
  chatId: string | null;
  userId: string | null;
};

type ChatMember = {
  id: string;
  user_id: string;
};

type User = {
  id: string;
  name: string | null;
  email: string | null;
};

type SplitPreview = {
  userId: string;
  label: string;
  percentage: number;
  amount: number;
};

function buildEqualPercentages(memberIds: string[]) {
  if (memberIds.length === 0) return {};

  const basePercentCents = Math.floor(10000 / memberIds.length);
  const remainder = 10000 % memberIds.length;

  return memberIds.reduce<Record<string, number>>((percentages, memberId, index) => {
    percentages[memberId] = (basePercentCents + (index < remainder ? 1 : 0)) / 100;
    return percentages;
  }, {});
}

export default function CreateExpenseButton({
  chatId,
  userId,
}: CreateExpenseButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [members, setMembers] = useState<User[]>([]);
  const [splitPercentages, setSplitPercentages] = useState<Record<string, number>>(
    {},
  );
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !chatId) return;

    async function fetchMembers() {
      setMembersLoading(true);

      const supabase = createClient();

      const { data: chatMembers, error: membersError } = await supabase
        .from("chat_members")
        .select("id, user_id")
        .eq("chat_id", chatId);

      if (membersError) {
        console.error("Error fetching chat members:", membersError);
        setMembersLoading(false);
        return;
      }

      const memberIds = ((chatMembers || []) as ChatMember[]).map(
        (member) => member.user_id,
      );

      if (memberIds.length === 0) {
        setMembers([]);
        setSplitPercentages({});
        setMembersLoading(false);
        return;
      }

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", memberIds);

      if (usersError) {
        console.error("Error fetching member details:", usersError);
        setMembers(
          memberIds.map((memberId) => ({
            id: memberId,
            name: null,
            email: null,
          })),
        );
        setSplitPercentages(buildEqualPercentages(memberIds));
        setMembersLoading(false);
        return;
      }

      const usersById = new Map(
        ((users || []) as User[]).map((user) => [user.id, user]),
      );

      setMembers(
        memberIds.map(
          (memberId) =>
            usersById.get(memberId) || {
              id: memberId,
              name: null,
              email: null,
          },
        ),
      );
      setSplitPercentages(buildEqualPercentages(memberIds));
      setMembersLoading(false);
    }

    fetchMembers();
  }, [chatId, open]);

  const parsedAmount = Number(amount);

  const splitPreview = useMemo<SplitPreview[]>(() => {
    if (members.length === 0) return [];

    const totalCents = Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Math.round(parsedAmount * 100)
      : 0;

    const splitCents = members.map((member, index) => {
      const percentCents = Math.round((splitPercentages[member.id] || 0) * 100);
      const rawCents = (totalCents * percentCents) / 10000;

      return {
        index,
        cents: Math.floor(rawCents),
        remainder: rawCents - Math.floor(rawCents),
      };
    });

    const assignedCents = splitCents.reduce(
      (total, split) => total + split.cents,
      0,
    );
    const centsLeft = totalCents - assignedCents;

    [...splitCents]
      .sort((firstSplit, secondSplit) => secondSplit.remainder - firstSplit.remainder)
      .slice(0, centsLeft)
      .forEach((split) => {
        splitCents[split.index].cents += 1;
      });

    return members.map((member, index) => {
      return {
        userId: member.id,
        label: member.name || member.email || member.id,
        percentage: splitPercentages[member.id] || 0,
        amount: splitCents[index].cents / 100,
      };
    });
  }, [members, parsedAmount, splitPercentages]);

  const percentageTotal = useMemo(() => {
    return members.reduce(
      (total, member) => total + (splitPercentages[member.id] || 0),
      0,
    );
  }, [members, splitPercentages]);

  function updateSplitPercentage(memberId: string, value: string) {
    const numericValue = Number(value);
    const nextPercentCents = Math.min(
      10000,
      Math.max(0, Math.round((Number.isFinite(numericValue) ? numericValue : 0) * 100)),
    );
    const otherMembers = members.filter((member) => member.id !== memberId);

    if (otherMembers.length === 0) {
      setSplitPercentages({ [memberId]: 100 });
      return;
    }

    const remainingPercentCents = 10000 - nextPercentCents;
    const basePercentCents = Math.floor(remainingPercentCents / otherMembers.length);
    const remainder = remainingPercentCents % otherMembers.length;

    setSplitPercentages({
      [memberId]: nextPercentCents / 100,
      ...otherMembers.reduce<Record<string, number>>((percentages, member, index) => {
        percentages[member.id] =
          (basePercentCents + (index < remainder ? 1 : 0)) / 100;
        return percentages;
      }, {}),
    });
  }

  function closeModal() {
    setOpen(false);
    setTitle("");
    setAmount("");
    setSplitPercentages({});
  }

  async function createExpense() {
    if (!chatId || !userId) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    if (splitPreview.length === 0) return;

    setSaving(true);

    const supabase = createClient();

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        chat_id: chatId,
        paid_by: userId,
        title: title.trim() || "Expense",
        amount: parsedAmount,
      })
      .select("id")
      .single();

    if (expenseError) {
      console.error("Error creating expense:", expenseError);
      setSaving(false);
      return;
    }

    const { error: splitError } = await supabase.from("expense_splits").insert(
      splitPreview.map((split) => ({
        expense_id: expense.id,
        user_id: split.userId,
        is_paid: split.userId === userId,
        amount: split.amount,
        receiver_id: userId,
      })),
    );

    if (splitError) {
      console.error("Error creating expense splits:", splitError);
      setSaving(false);
      return;
    }

    setSaving(false);
    closeModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!chatId || !userId}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-background hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Create expense"
      >
        <ReceiptIndianRupee size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create Expense</h2>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 hover:bg-muted transition"
                aria-label="Close expense modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Title</label>
                <input
                  type="text"
                  placeholder="Dinner, rent, groceries..."
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">Split Between</h3>
                  <span className="text-xs text-muted-foreground">
                    {members.length} member
                    {members.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl border p-2">
                  {membersLoading ? (
                    <p className="p-2 text-sm text-muted-foreground">
                      Loading members...
                    </p>
                  ) : members.length > 0 ? (
                    splitPreview.map((split) => (
                      <div
                        key={split.userId}
                        className="grid grid-cols-[1fr_88px_72px] items-center gap-3 rounded-lg px-3 py-2"
                      >
                        <p className="truncate text-sm">{split.label}</p>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={split.percentage.toFixed(2)}
                            onChange={(event) =>
                              updateSplitPercentage(split.userId, event.target.value)
                            }
                            className="w-full rounded-lg border bg-background py-1.5 pl-2 pr-6 text-right text-sm outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            %
                          </span>
                        </div>
                        <p className="shrink-0 text-sm font-medium">
                          {split.amount.toFixed(2)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="p-2 text-sm text-muted-foreground">
                      No members found for this chat.
                    </p>
                  )}
                </div>
                {members.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Total: {percentageTotal.toFixed(2)}%
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border px-4 py-2 hover:bg-muted transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createExpense}
                disabled={
                  saving ||
                  splitPreview.length === 0 ||
                  !Number.isFinite(parsedAmount) ||
                  parsedAmount <= 0
                }
                className="rounded-xl bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
              >
                {saving ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
