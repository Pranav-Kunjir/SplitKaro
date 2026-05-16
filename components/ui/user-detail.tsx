"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type UserData = {
  id: string
  email: string
}

export default function UserDetail({ userId }: { userId: string }) {
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    async function getUserDetails() {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("users")
        .select("id, email")
        .eq("id", userId)
        .single()

      if (error) {
        console.error("Error fetching user details:", error)
        return
      }

      setUserData(data)
    }

    getUserDetails()
  }, [userId])

  return (
    <div>
      <p><strong>ID:</strong> {userData?.id}</p>
      <p><strong>Email:</strong> {userData?.email}</p>
    </div>
  )
}