"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export default function Chat({
  userId,
  chatId,
}: {
  userId: string | null
  chatId: string | null
}) {
  const supabase = createClient()

  const [messages, setMessages] = useState<any[]>(
    []
  )

  const [loading, setLoading] = useState(true)

  // Initial fetch
  async function fetchMessages() {
    if (!chatId) return

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", {
        ascending: true,
      })

    setLoading(false)

    if (error) {
      console.error(
        "Error fetching messages:",
        error
      )
      return
    }

    setMessages(data || [])
  }

  useEffect(() => {
    fetchMessages()
  }, [chatId])

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
            payload.new,
          ])
        }
      )

      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId])

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
      ) : messages.length === 0 ? (
        <p className="text-muted-foreground">
          No messages yet
        </p>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[70%] rounded-xl px-4 py-2 ${
              message.sender_id === userId
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <p>{message.message}</p>
            <p className="text-xs text-muted-foreground">
              {message.sender_id === userId ? "You" : "Other"}
            </p>
          </div>
        ))
      )}
    </div>
  )
}