import { FormEvent, useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/utils/api";

type Message = {
  sender: "user" | "assistant";
  content: string;
};

const starterPrompts = [
  "Which files should I edit first?",
  "What dependencies do I need?",
  "What are the riskiest parts?",
];

export default function Chat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt) return;

    setMessages((prev) => [...prev, { sender: "user", content: prompt }]);
    setChatInput("");
    setIsChatLoading(true);
    setError("");

    try {
      const data = await sendChatMessage(sessionId, prompt);
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          content: data.chatHistory[data.chatHistory.length - 1] || data.message,
        },
      ]);
    } catch (chatError) {
      console.error("Error in chat submission:", chatError);
      setError("Chat failed. Check the server logs and API keys, then try again.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const askStarterPrompt = (prompt: string) => {
    setChatInput(prompt);
  };

  const formatMessage = (content: string) => {
    const parts = content.split(/```[\w]*\n/);
    return parts.map((part, index) => {
      if (index % 2 === 0) {
        const formattedPart = part
          .replace(/####\s(.*?)$/gm, "<h4>$1</h4>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/(\d+\.\s.*?)$/gm, "$1<br />")
          .replace(/\n/g, "<br />");

        return (
          <div
            key={index}
            className="chat-copy"
            dangerouslySetInnerHTML={{ __html: formattedPart }}
          />
        );
      }

      return (
        <pre
          key={index}
          className="my-3 overflow-x-auto border border-white/10 bg-[#07100f] p-3 text-sm text-emerald-100"
        >
          <code>{part.replace(/```$/, "")}</code>
        </pre>
      );
    });
  };

  return (
    <section className="mt-8 border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Follow-up chat</h2>
          <p className="mt-2 text-sm text-slate-300">
            Ask about files, tradeoffs, implementation order, or missing context.
          </p>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => askStarterPrompt(prompt)}
              className="border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-300 hover:bg-cyan-300/10"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 max-h-[34rem] min-h-36 overflow-y-auto border border-white/10 bg-[#0c1312] p-4">
        {messages.length === 0 && (
          <p className="text-sm leading-6 text-slate-400">
            The chat will use the migration context from this session once you send a question.
          </p>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.sender}-${index}`}
            className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(44rem,90%)] border px-4 py-3 text-sm leading-6 ${
                message.sender === "user"
                  ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-50"
                  : "border-white/10 bg-white/[0.04] text-slate-200"
              }`}
            >
              {formatMessage(message.content)}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {error && (
        <div className="mt-4 border border-red-300/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleChatSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask a follow-up question"
          className="min-h-12 flex-1 border border-white/15 bg-[#0c1312] px-3 py-3 text-white outline-none transition focus:border-cyan-300"
          required
        />
        <button
          type="submit"
          className="bg-cyan-300 px-5 py-3 font-semibold text-[#07100f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          disabled={isChatLoading}
        >
          {isChatLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
