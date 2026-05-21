"use client";

import { createClient } from "@/lib/supabase/client";
import type { Html5Qrcode } from "html5-qrcode";
import { ImageUp, QrCode, ReceiptIndianRupee, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

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

type UpiMerchant = {
  rawUrl: string;
  upiId: string | null;
  name: string | null;
  amount: string | null;
};

type UpiPaymentParams = {
  pa: string;
  pn: string;
  am: string;
  cu: string;
  tr: string;
  tid: string;
};

function buildEqualPercentages(memberIds: string[]) {
  if (memberIds.length === 0) return {};

  const basePercentCents = Math.floor(10000 / memberIds.length);
  const remainder = 10000 % memberIds.length;

  return memberIds.reduce<Record<string, number>>(
    (percentages, memberId, index) => {
      percentages[memberId] =
        (basePercentCents + (index < remainder ? 1 : 0)) / 100;
      return percentages;
    },
    {},
  );
}

export default function CreateExpenseButton({
  chatId,
  userId,
}: CreateExpenseButtonProps) {
  const scannerElementId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [upiMerchant, setUpiMerchant] = useState<UpiMerchant | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [splitPercentages, setSplitPercentages] = useState<
    Record<string, number>
  >({});
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

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      setScanning(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch (error) {
      console.error("Error stopping QR scanner:", error);
    } finally {
      scannerRef.current = null;
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const parsedAmount = Number(amount);

  const splitPreview = useMemo<SplitPreview[]>(() => {
    if (members.length === 0) return [];

    const totalCents =
      Number.isFinite(parsedAmount) && parsedAmount > 0
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
      .sort(
        (firstSplit, secondSplit) =>
          secondSplit.remainder - firstSplit.remainder,
      )
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

  function encodeUpiParam(value: string) {
    return encodeURIComponent(value);
  }

  function buildUpiQuery(params: UpiPaymentParams) {
    return Object.entries(params)
      .filter(([, value]) => value.trim().length > 0)
      .map(([key, value]) => `${key}=${encodeUpiParam(value)}`)
      .join("&");
  }

  function updateSplitPercentage(memberId: string, value: string) {
    const numericValue = Number(value);
    const nextPercentCents = Math.min(
      10000,
      Math.max(
        0,
        Math.round((Number.isFinite(numericValue) ? numericValue : 0) * 100),
      ),
    );
    const otherMembers = members.filter((member) => member.id !== memberId);

    if (otherMembers.length === 0) {
      setSplitPercentages({ [memberId]: 100 });
      return;
    }

    const remainingPercentCents = 10000 - nextPercentCents;
    const basePercentCents = Math.floor(
      remainingPercentCents / otherMembers.length,
    );
    const remainder = remainingPercentCents % otherMembers.length;

    setSplitPercentages({
      [memberId]: nextPercentCents / 100,
      ...otherMembers.reduce<Record<string, number>>(
        (percentages, member, index) => {
          percentages[member.id] =
            (basePercentCents + (index < remainder ? 1 : 0)) / 100;
          return percentages;
        },
        {},
      ),
    });
  }

  function parseUpiQr(decodedText: string) {
    try {
      console.log("Scanned UPI QR payload:", decodedText);

      const url = new URL(decodedText);
      const upiId = url.searchParams.get("pa");
      const name = url.searchParams.get("pn");
      const scannedAmount = url.searchParams.get("am");

      if (!upiId && !name && !scannedAmount) {
        setScannerError("This QR code does not contain UPI payment details.");
        return;
      }

      setUpiMerchant({
        rawUrl: decodedText,
        upiId,
        name,
        amount: scannedAmount,
      });

      if (name && !title.trim()) {
        setTitle(name);
      }

      if (scannedAmount && Number(scannedAmount) > 0) {
        setAmount(scannedAmount);
      }

      setScannerError(null);
      void stopScanner();
    } catch (error) {
      console.error("Error parsing UPI QR code:", error);
      setScannerError("Scanned QR code is not a valid UPI URL.");
    }
  }

  async function startScanner() {
    setScannerError(null);

    try {
      await stopScanner();

      if (!window.isSecureContext) {
        setScannerError(
          "Camera scanning needs HTTPS or localhost. Use Upload QR, or open the app over HTTPS.",
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError(
          "Camera streaming is not supported by this browser. Use Upload QR instead.",
        );
        return;
      }

      setScanning(true);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 240,
            height: 240,
          },
        },
        (decodedText) => {
          parseUpiQr(decodedText);
        },
        undefined,
      );

      setScanning(true);
    } catch (error) {
      console.error("Error starting QR scanner:", error);
      scannerRef.current = null;
      setScanning(false);
      setScannerError(
        "Unable to start camera. Use HTTPS/localhost, allow camera permission, or use Upload QR.",
      );
    }
  }

  async function scanQrImage(file: File) {
    setScannerError(null);
    setScanningImage(true);

    try {
      await stopScanner();

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(scannerElementId);
      const decodedText = await scanner.scanFile(file, false);

      scanner.clear();
      parseUpiQr(decodedText);
    } catch (error) {
      console.error("Error scanning QR image:", error);
      setScannerError("Could not read a UPI QR from this image.");
    } finally {
      setScanningImage(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function buildUpiPaymentUrl() {
    if (!upiMerchant?.upiId) return null;

    try {
      const txnId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const query = buildUpiQuery({
        pa: upiMerchant.upiId,
        pn: upiMerchant.name || "Merchant",
        am: parsedAmount.toFixed(2),
        cu: "INR",
        tr: txnId,
        tid: txnId,
      });
      const isAndroid =
        typeof navigator !== "undefined" &&
        /Android/i.test(navigator.userAgent);
      const paymentUrl = isAndroid
        ? `intent://pay?${query}#Intent;scheme=upi;end`
        : `upi://pay?${query}`;

      console.log("Generated UPI payment URL:", paymentUrl);

      return paymentUrl;
    } catch (error) {
      console.error("Error building UPI payment URL:", error);
      return null;
    }
  }

  function closeModal() {
    void stopScanner();
    setOpen(false);
    setTitle("");
    setAmount("");
    setUpiMerchant(null);
    setScannerError(null);
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
        title: title.trim() || upiMerchant?.name || "Expense",
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
    const upiPaymentUrl = buildUpiPaymentUrl();
    closeModal();

    if (upiPaymentUrl) {
      window.location.href = upiPaymentUrl;
    }
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
              <div className="rounded-xl border p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium">UPI QR</h3>
                    {upiMerchant ? (
                      <p className="truncate text-xs text-muted-foreground">
                        Merchant details captured.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Scan a UPI QR to fill payment details.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        if (file) {
                          void scanQrImage(file);
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanningImage}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 transition"
                    >
                      <ImageUp size={16} />
                      {scanningImage ? "Reading" : "Upload"}
                    </button>

                    <button
                      type="button"
                      onClick={scanning ? stopScanner : startScanner}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-muted transition"
                    >
                      <QrCode size={16} />
                      {scanning ? "Stop" : "Scan"}
                    </button>
                  </div>
                </div>

                <div
                  id={scannerElementId}
                  className={
                    scanning ? "overflow-hidden rounded-xl border" : "hidden"
                  }
                />

                {scannerError && (
                  <p className="mt-3 text-sm text-red-500">{scannerError}</p>
                )}

                {upiMerchant && (
                  <div className="mt-3 space-y-1 rounded-xl bg-muted p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">UPI ID</span>
                      <span className="truncate font-medium">
                        {upiMerchant.upiId || "Not found"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Name</span>
                      <span className="truncate font-medium">
                        {upiMerchant.name || "Not found"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">QR Amount</span>
                      <span className="truncate font-medium">
                        {upiMerchant.amount || "Not set"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

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
                              updateSplitPercentage(
                                split.userId,
                                event.target.value,
                              )
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
