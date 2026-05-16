"use client"
import { createClient } from "@/lib/supabase/client"
import {useChat} from "@/app/context/chat-context"
import Chat from "./chat-component"
import MessageInput from "./ui/message-input"
export default function ChatInputWrapper() {
    const { currentChatId, currentUserId } = useChat()
    return (
        <div>
            {currentChatId ? (
                <Chat userId={currentUserId} chatId={currentChatId} />
            ) : (
                <p className="text-center text-gray-500">
                    Select a chat to start messaging
                </p>
            )}
            <MessageInput userId={currentUserId} chatId={currentChatId} />

        </div>
    )

}