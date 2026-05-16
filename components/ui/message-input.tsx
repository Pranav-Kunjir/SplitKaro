"use client"

import { createClient } from "@/lib/supabase/client"

export default function MessageInput({ chatId, userId }: { chatId: string | null; userId: string | null }) {
    const supabase = createClient()
    async function sendMessage(message: string) {
        if (!chatId || !userId) return
        const { data, error } = await supabase
            .from("messages")
            .insert({
                chat_id: chatId,
                sender_id: userId,
                message: message,
            })
        if (error) {
            console.error("Error sending message:", error)
        } else {
            console.log("Message sent:", data)
        }
    }
    return (
        <div className="p-4 border-t">
            <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const content = formData.get("message") as string
                sendMessage(content)
                e.currentTarget.reset()
            }} className="flex space-x-2">
                <input type="text" name="message" placeholder="Type your message..." className="flex-1 border rounded px-3 py-2" />
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Send</button>
            </form>
        </div>
    )
}