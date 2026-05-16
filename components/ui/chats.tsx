"use client"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import ChatInfoTab from "./chatinfotab"



export default function Chats({ userId }: { userId: string }) {
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
            console.error("Error fetching chats:", error)
            return
        }
        console.log("Fetched chats:", data)
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
                <ul>
                    {chats.map((chat) => (
                        <li key={chat.id}>
                            <ChatInfoTab chatId={chat.chat_id} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}