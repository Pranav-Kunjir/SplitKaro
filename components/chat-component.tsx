"use client"

import { createClient } from "@/lib/supabase/client"
import { useCallback, useEffect, useMemo, useState } from "react"
import ExpenseCard from "./ui/expense-card"

type Message = {
  id: string
  created_at: string
  chat_id: string | null
  sender_id: string | null
  message: string | null
}

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

type TimelineItem =
  | {
      type: "message"
      created_at: string
      data: Message
    }
  | {
      type: "expense"
      created_at: string
      data: Expense
    }

export default function Chat({
  userId,
  chatId,
}: {
  userId: string | null
  chatId: string | null
}) {
  const supabase = useMemo(() => createClient(), [])

  const [messages, setMessages] = useState<Message[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [loading, setLoading] = useState(true)

  const timelineItems = useMemo<TimelineItem[]>(() => {
    return [
      ...messages.map((message) => ({
        type: "message" as const,
        created_at: message.created_at,
        data: message,
      })),
      ...expenses.map((expense) => ({
        type: "expense" as const,
        created_at: expense.created_at,
        data: expense,
      })),
    ].sort(
      (firstItem, secondItem) =>
        new Date(firstItem.created_at).getTime() -
        new Date(secondItem.created_at).getTime()
    )
  }, [expenses, messages])

  // Initial fetch
  const fetchTimeline = useCallback(async () => {
    if (!chatId) return

    setLoading(true)

    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", {
        ascending: true,
      })

    if (messageError) {
      console.error(
        "Error fetching messages:",
        messageError
      )
      setLoading(false)
      return
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", {
        ascending: true,
      })

    setLoading(false)

    if (expenseError) {
      console.error(
        "Error fetching expenses:",
        expenseError
      )
      return
    }

    setMessages((messageData || []) as Message[])
    setExpenses((expenseData || []) as Expense[])
  }, [chatId, supabase])

  useEffect(() => {
    fetchTimeline()
  }, [fetchTimeline])

  // Realtime subscription
  useEffect(() => {
    if (!chatId) return

    const channel = supabase
      .channel(`chat-${chatId}`)

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log(
            "New message:",
            payload.new
          )

          setMessages((prev) => [
            ...prev,
            payload.new as Message,
          ])
        }
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "expenses",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log(
            "New expense:",
            payload.new
          )

          setExpenses((prev) => [
            ...prev,
            payload.new as Expense,
          ])
        }
      )

      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  if (!chatId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          Select a chat
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {loading ? (
        <p>Loading messages...</p>
      ) : timelineItems.length === 0 ? (
        <p className="text-muted-foreground">
          No messages yet
        </p>
      ) : (
        timelineItems.map((item) => {
          if (item.type === "expense") {
            return (
              <ExpenseCard
                key={`expense-${item.data.id}`}
                expense={item.data}
                currentUserId={userId}
              />
            )
          }

          return (
            <div
              key={`message-${item.data.id}`}
              className={`max-w-[70%] rounded-xl px-4 py-2 ${
                item.data.sender_id === userId
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p>{item.data.message}</p>
              <p className="text-xs text-muted-foreground">
                {item.data.sender_id === userId ? "You" : "Other"}
              </p>
            </div>
          )
        })
      )}
    </div>
  )
}
