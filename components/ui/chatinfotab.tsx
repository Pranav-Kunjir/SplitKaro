"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

type ChatInfo = {
  id: string
  chat_name: string
  chat_description: string
  admin: string
}

export default function ChatInfoTab({
  chatId,
}: {
  chatId: string
}) {
  const supabase = createClient()

  const [chatInfo, setChatInfo] =
    useState<ChatInfo | null>(null)

  const [loading, setLoading] = useState(true)

  async function fetchChatInfo() {
    const { data, error } = await supabase
      .from("chat")
      .select("*")
      .eq("id", chatId)
      .single()

    setLoading(false)

    if (error) {
      console.error(
        "Error fetching chat info:",
        error
      )
      return
    }

    setChatInfo(data)
  }

  useEffect(() => {
    fetchChatInfo()
  }, [chatId])

  if (loading) {
    return (
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">
          Loading chat info...
        </p>
      </div>
    )
  }

  if (!chatInfo) {
    return (
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">
          No chat info found.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-background p-5 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {chatInfo.chat_name}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          {chatInfo.chat_description ||
            "No description"}
        </p>
      </div>
    </div>
  )
}