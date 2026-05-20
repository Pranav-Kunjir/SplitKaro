"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useMemo, useState } from "react"
import { Plus, Search, X } from "lucide-react"

type CreateNewChatProps = {
  userId: string
}

type Friendship = {
  id: number
  user_a_id: string | null
  user_b_id: string | null
}

type Friend = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

export default function CreateNewChat({
  userId,
}: CreateNewChatProps) {
  const [open, setOpen] = useState(false)
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)

  const [chatName, setChatName] = useState("")
  const [chatDescription, setChatDescription] = useState("")
  const [friendSearch, setFriendSearch] = useState("")
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [friendsLoading, setFriendsLoading] = useState(false)

  useEffect(() => {
    if (!memberPickerOpen) return

    async function fetchFriends() {
      setFriendsLoading(true)

      const supabase = createClient()

      const { data: friendships, error: friendshipError } = await supabase
        .from("friendships")
        .select("id, user_a_id, user_b_id")
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)

      if (friendshipError) {
        console.error("Error fetching friendships:", friendshipError)
        setFriendsLoading(false)
        return
      }

      const friendIds = Array.from(
        new Set(
          ((friendships || []) as Friendship[])
            .map((friendship) =>
              friendship.user_a_id === userId
                ? friendship.user_b_id
                : friendship.user_a_id
            )
            .filter((friendId): friendId is string => Boolean(friendId))
        )
      )

      if (friendIds.length === 0) {
        setFriends([])
        setFriendsLoading(false)
        return
      }

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, email, phone")
        .in("id", friendIds)

      if (usersError) {
        console.error("Error fetching friend details:", usersError)
        setFriendsLoading(false)
        return
      }

      setFriends((users || []) as Friend[])
      setFriendsLoading(false)
    }

    fetchFriends()
  }, [memberPickerOpen, userId])

  const filteredFriends = useMemo(() => {
    const search = friendSearch.trim().toLowerCase()

    if (!search) return friends

    return friends.filter((friend) =>
      [friend.name, friend.email, friend.phone, friend.id]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(search))
    )
  }, [friendSearch, friends])

  function toggleSelectedMember(friendId: string) {
    setSelectedMemberIds((currentIds) =>
      currentIds.includes(friendId)
        ? currentIds.filter((id) => id !== friendId)
        : [...currentIds, friendId]
    )
  }

  function resetForm() {
    setChatName("")
    setChatDescription("")
    setFriendSearch("")
    setSelectedMemberIds([])
    setMemberPickerOpen(false)
  }

  async function createChat() {
    if (!chatName.trim()) return

    try {
      setLoading(true)

      const supabase = createClient()

      // Create chat
      const { data, error } = await supabase
        .from("chat")
        .insert({
          chat_name: chatName,
          chat_description: chatDescription,
          admin: userId,
        })
        .select("*")
        .single()

      if (error) {
        console.error("Error creating chat:", error)
        return
      }

      const memberRows = [
        {
          chat_id: data.id,
          user_id: userId,
          user_status: "admin",
        },
        ...selectedMemberIds.map((memberId) => ({
          chat_id: data.id,
          user_id: memberId,
          user_status: "member",
        })),
      ]

      // Add creator and selected friends to members table
      const { error: memberError } = await supabase
        .from("chat_members")
        .insert(memberRows)

      if (memberError) {
        console.error("Error adding users to chat:", memberError)
        return
      }

      console.log("Chat created:", data)

      // Reset
      resetForm()

      // Close modal
      setOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Create Button */}
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2 font-medium hover:opacity-90 transition"
      >
        Create New Chat
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Create Chat
              </h2>

              <button
                onClick={() => {
                  setOpen(false)
                  setMemberPickerOpen(false)
                }}
                className="rounded-md p-1 hover:bg-muted transition"
                aria-label="Close create chat modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Chat Name
                </label>

                <input
                  type="text"
                  placeholder="Enter chat name"
                  value={chatName}
                  onChange={(e) =>
                    setChatName(e.target.value)
                  }
                  className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  placeholder="Enter description"
                  value={chatDescription}
                  onChange={(e) =>
                    setChatDescription(e.target.value)
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium">
                    Members
                  </label>

                  <button
                    type="button"
                    onClick={() => setMemberPickerOpen(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border hover:bg-muted transition"
                    aria-label="Add chat members"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {selectedMemberIds.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedMemberIds.length} friend
                    {selectedMemberIds.length === 1 ? "" : "s"} selected
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No friends selected.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setOpen(false)
                  setMemberPickerOpen(false)
                }}
                className="rounded-xl border px-4 py-2 hover:bg-muted transition"
              >
                Cancel
              </button>

              <button
                onClick={createChat}
                disabled={loading}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-2 hover:opacity-90 disabled:opacity-50 transition"
              >
                {loading ? "Creating..." : "Create Chat"}
              </button>
            </div>
          </div>

          {memberPickerOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
              <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Add Members
                  </h3>

                  <button
                    type="button"
                    onClick={() => setMemberPickerOpen(false)}
                    className="rounded-md p-1 hover:bg-muted transition"
                    aria-label="Close member picker"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative mb-4">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Search friends"
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="w-full rounded-xl border bg-background py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {friendsLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Loading friends...
                    </p>
                  ) : filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => {
                      const selected = selectedMemberIds.includes(friend.id)

                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => toggleSelectedMember(friend.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {friend.name || friend.email || friend.id}
                              </p>
                              {friend.email && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {friend.email}
                                </p>
                              )}
                            </div>

                            <span className="text-xs font-medium text-muted-foreground">
                              {selected ? "Selected" : "Add"}
                            </span>
                          </div>
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No friends found.
                    </p>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMemberPickerOpen(false)}
                    className="rounded-xl bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
