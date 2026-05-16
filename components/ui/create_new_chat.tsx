"use client"

import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { X } from "lucide-react"

type CreateNewChatProps = {
  userId: string
}

export default function CreateNewChat({
  userId,
}: CreateNewChatProps) {
  const [open, setOpen] = useState(false)

  const [chatName, setChatName] = useState("")
  const [chatDescription, setChatDescription] = useState("")

  const [loading, setLoading] = useState(false)

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

      // Add creator to members table
      const { error: memberError } = await supabase
        .from("chat_members")
        .insert({
          chat_id: data.id,
          user_id: userId,
          user_status: "admin",
        })

      if (memberError) {
        console.error("Error adding user to chat:", memberError)
        return
      }

      console.log("Chat created:", data)

      // Reset
      setChatName("")
      setChatDescription("")

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
                onClick={() => setOpen(false)}
                className="rounded-md p-1 hover:bg-muted transition"
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
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
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
        </div>
      )}
    </>
  )
}