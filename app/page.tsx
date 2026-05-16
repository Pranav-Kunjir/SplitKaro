import { EnvVarWarning } from "@/components/env-var-warning"
import { AuthButton } from "@/components/auth-button"
import { hasEnvVars } from "@/lib/utils"
import { Suspense} from "react"
import ChatInputWrapper from "@/components/chat-input-wrapper"
import SearchUser from "@/components/ui/search-user"
import FetchRequest from "@/components/fetchrequest"
import FriendsSidebar from "@/components/sidebar"



export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="w-full border-b border-border h-16">
        <div className="max-w-7xl mx-auto h-full flex justify-between items-center px-5 text-sm">
          <div className="font-semibold">
            Chat App
          </div>

          {!hasEnvVars ? (
            <EnvVarWarning />
          ) : (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex">
        {/* Left Sidebar */}
        <FriendsSidebar />

        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
          <SearchUser />
          <FetchRequest />
          <ChatInputWrapper />
        </div>
      </div>
    </main>
  )
}