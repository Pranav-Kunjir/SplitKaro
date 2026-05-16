"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import Chat from "./ui/chats"
import UserDetail from "./ui/user-detail"
import CreateNewChat from "./ui/create_new_chat"
const supabase = createClient()

type Friendship = {
  id: number
  user_a_id: string
  user_b_id: string
}

type Tab = "chats" | "friends"

export default function FriendsSidebar() {
  const [friends, setFriends] = useState<Friendship[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Default tab = chats
  const [activeTab, setActiveTab] = useState<Tab>("chats")

  // Get current user
  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error("Error getting user:", error)
        setLoading(false)
        return
      }

      const userId = data.user?.id ?? null

      setCurrentUserId(userId)

      if (userId) {
        await fetchFriends(userId)
      } else {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  // Fetch friendships
  async function fetchFriends(userId: string) {
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)

    setLoading(false)

    if (error) {
      console.error("Error fetching friends:", error)
      return
    }

    setFriends(data || [])
  }

  return (
    <aside className="w-72 h-screen sticky top-0 border-r bg-background p-4 overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-4">
        Messages
      </h2>

      {/* Tabs */}
      <div className="flex mb-6 rounded-lg border p-1 bg-muted">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "chats"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Chats
        </button>

        <button
          onClick={() => setActiveTab("friends")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "friends"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Friends
        </button>
      </div>

      {/* Chats Tab */}
      {currentUserId != null && activeTab === "chats" && (
        <div>
          <Chat userId={currentUserId } />
          <CreateNewChat userId={currentUserId} />
        </div>
      )}

      {/* Friends Tab */}
      {activeTab === "friends" && (
        <>
          {loading ? (
            <div className="space-y-3">
              <div className="h-12 rounded-lg bg-muted animate-pulse" />
              <div className="h-12 rounded-lg bg-muted animate-pulse" />
              <div className="h-12 rounded-lg bg-muted animate-pulse" />
            </div>
          ) : friends.length > 0 ? (
            <ul className="space-y-2">
              {friends.map((friendship) => {
                const friendId =
                  friendship.user_a_id === currentUserId
                    ? friendship.user_b_id
                    : friendship.user_a_id

                return (
                  <li
                    key={friendship.id}
                    className="rounded-xl border p-3 hover:bg-muted transition-colors"
                  >
                    <UserDetail userId={friendId} />
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No friends found.
            </p>
          )}
        </>
      )}
    </aside>
  )
}