import { ChatPanel } from "@/components/chat-panel";

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-7rem)]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Agent Chat</h2>
        <p className="text-sm text-gray-500">
          Query patient memory, request evidence, or simulate break-glass access.
        </p>
      </div>
      <ChatPanel />
    </div>
  );
}
