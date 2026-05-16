"use client"

import { useEffect, useState } from "react"
import { createClient } from "../../lib/supabase/client"

type User = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
}
const supabase = createClient()

async function sendRequest(receiverId: string) {
  let { data, error :userError } = await supabase.auth.getUser();
  if (userError || !data?.user) {
    console.error("User not logged in")
    return
  }
  const { error} = await supabase
    .from("friend_requests")
    .insert({
      sender_id: data.user.id,
      receiver_id: `${receiverId}`,
      status: "pending"
    })

  if (error) {
      console.error(error)
      return
    }

    console.log("Request sent")
  }


export default function SearchUser() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchUsers() {
      if (search.trim().length < 1) {
        setUsers([])
        return
      } 
      

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)

      if (error) {
        console.error(error)
        return
      }

      setUsers(data || [])
    }
    
    fetchUsers()
  }, [search])



  return (
    <div>
      <div className="input-group">
        <input
          type="text"
          placeholder="Search by name, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input input-bordered w-full max-w-xs"
        />
      </div>

      <div className="divider"></div>

      <div className="flex flex-col gap-4 ">
        {users.map((user) => (
            <div key={user.id} className="p-4 border-b">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Phone:</strong> {user.phone}</p>
              <div className="sentRequest">
              <button className="btn btn-primary" onClick={() => sendRequest(user.id)}>
                Send Friend Request
              </button>
            </div>
            </div>
        ))}
      </div>
    </div>
  )
}