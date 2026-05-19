import { createClient } from "@/lib/supabase/server"

import FriendsSidebar from "@/components/sidebar"
import SearchUser from "@/components/ui/search-user"
import FetchRequest from "@/components/fetchrequest"
import ChatInputWrapper from "@/components/chat-input-wrapper"
import { AuthButton } from "@/components/auth-button"

export default async function HomeContent() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">
            Welcome
          </h1>

          <AuthButton />
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <FriendsSidebar />

      <div className="flex-1 p-6 space-y-6">
        <SearchUser />
        <FetchRequest />
        <ChatInputWrapper />
      </div>
    </div>
  )
}