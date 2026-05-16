"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"

import { createClient } from "@/lib/supabase/client"

type ChatContextType = {
  currentChatId: string | null
  setCurrentChatId: (
    id: string | null
  ) => void

  currentUserId: string | null
}

const ChatContext =
  createContext<ChatContextType | null>(null)

export function ChatProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const [currentChatId, setCurrentChatId] =
    useState<string | null>(null)

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null)

  // Get current logged in user
  useEffect(() => {
    async function getUser() {
      const { data, error } =
        await supabase.auth.getUser()

      if (error) {
        console.error(
          "Error getting user:",
          error
        )
        return
      }

      setCurrentUserId(data.user?.id ?? null)
    }

    getUser()
  }, [])

  return (
    <ChatContext.Provider
      value={{
        currentChatId,
        setCurrentChatId,

        currentUserId,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)

  if (!context) {
    throw new Error(
      "useChat must be inside provider"
    )
  }

  return context
}