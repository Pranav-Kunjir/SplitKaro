"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import ChatInfoTab from "./chatinfotab"
import { useChat } from "@/app/context/chat-context"

export default function Chats({
  userId,
}: {
  userId: string
}) {
  const { setCurrentChatId } = useChat()

  const supabase = createClient()

  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchChats() {
    const { data, error } = await supabase
      .from("chat_members")
      .select("*")
      .eq("user_id", userId)

    setLoading(false)

    if (error) {
      console.error(
        "Error fetching chats:",
        error
      )
      return
    }

    setChats(data || [])
  }

  useEffect(() => {
    fetchChats()
  }, [userId])

  return (
    <div>
      {loading ? (
        <p>Loading chats...</p>
      ) : (
        <ul className="space-y-3">
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                onClick={() =>
                  setCurrentChatId(chat.chat_id)
                }
                className="w-full text-left"
              >
                <ChatInfoTab
                  chatId={chat.chat_id}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}