"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import UserDetail from "./ui/user-detail"

const supabase = createClient()

export default function FetchRequest() {
  const [requests, setRequests] = useState<any[]>([])
  const [userid, setUserid] = useState<string | null>(null)

  // Get logged in user
  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error("Error fetching user:", error)
        return
      }

      setUserid(data.user?.id ?? null)
    }

    getUser()
  }, [])

  // Fetch friend requests
  async function fetchall(currentUserId: string) {
    const { data, error } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("receiver_id", currentUserId)
      .eq("status", "pending")

    if (error) {
      console.error("Error fetching friend requests:", error)
      return
    }

    console.log("Friend requests:", data)
    setRequests(data || [])
  }

  // Fetch requests after userid is available
  useEffect(() => {
    if (userid) {
      fetchall(userid)
    }
  }, [userid])

  // Update request status
    async function updateRequestStatus(
    requestId: number,
    status: string
    ) {
    const { data, error } = await supabase
        .from("friend_requests")
        .update({ status })
        .eq("id", requestId)
        .select()

    console.log("DATA:", data)
    console.log("ERROR:", error)
    }

  // Accept friend request
  async function addFriend(
    requestId: number,
    sender_id: string
  ) {
    if (!userid) return

    const { error } = await supabase
      .from("friendships")
      .insert({
        user_a_id: userid,
        user_b_id: sender_id,
      })

    if (error) {
      console.error("Error adding friend:", error)
      return
    }

    await updateRequestStatus(requestId, "ACCEPTED")

    console.log("Friend added successfully")

    fetchall(userid)
  }

  return (
    <div>
      {requests.length === 0 && (
        <p>No pending friend requests</p>
      )}

      {requests.map((request) => (
        <div
          key={request.id}
          className="p-4 border rounded mb-2"
        >
          <UserDetail userId={request.sender_id} />

          <button
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
            onClick={() =>
              addFriend(
                request.id,
                request.sender_id
              )
            }
          >
            Accept
          </button>
        </div>
      ))}
    </div>
  )
}