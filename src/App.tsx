import React, { useState, useRef, useEffect } from "react";
import {
  Brain,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Music,
  Code,
  Globe,
  MapPin,
  Send,
  Loader2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Layers,
  Terminal,
  Volume2,
  FileText,
  Cpu,
  Zap,
  Menu,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Settings,
  ChevronRight,
  Compass,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  groundingMetadata?: any;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "studio" | "music" | "intelligence">("chat");

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "New Neural Conversation",
      messages: [
        {
          role: "assistant",
          content: "Hello! I am PraBin, your intelligent personal assistant powered by custom neural networks. How can I assist you today?",
        },
      ],
    },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState("1");
  const [inputMessage, setInputMessage] = useState("");
  const [chatPersona, setChatPersona] = useState("general");
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Studio (Image Gen) state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageAspectRatio, setImageAspectRatio] = useState("1:1");
  const [imageSize, setImageSize] = useState("1K");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [editImageFile, setEditImageFile] = useState<{ data: string; mimeType: string } | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  // Music state
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicDuration, setMusicDuration] = useState<"clip" | "pro">("clip");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [musicLyrics, setMusicLyrics] = useState("");
  const [musicLoading, setMusicLoading] = useState(false);

  // Intelligence state
  const [intelligenceContent, setIntelligenceContent] = useState("");
  const [intelligenceTask, setIntelligenceTask] = useState<"summarize" | "code-review" | "rewrite">("summarize");
  const [intelligenceResult, setIntelligenceResult] = useState("");
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession.messages, chatLoading]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: "New Neural Conversation",
      messages: [
        {
          role: "assistant",
          content: "Hello! I am PraBin, your intelligent personal assistant powered by custom neural networks. What shall we explore today?",
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setActiveTab("chat");
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || chatLoading) return;

    if (!customText) setInputMessage("");

    const updatedMessages: Message[] = [...currentSession.messages, { role: "user", content: textToSend }];

    // Update session title if it's the first user message
    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          title: s.messages.length <= 1 ? textToSend.slice(0, 30) + (textToSend.length > 30 ? "..." : "") : s.title,
          messages: updatedMessages,
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setChatLoading(true);

    let systemInstruction = "You are PraBin, an intelligent personal assistant powered by custom neural networks.";
    if (chatPersona === "coder") {
      systemInstruction = "You are PraBin CodeCore, an elite AI software architect powered by custom neural networks specializing in clean, robust, and secure code in TypeScript, React, and Node.js.";
    } else if (chatPersona === "creative") {
      systemInstruction = "You are PraBin Muse, a visionary creative writer and concept generator powered by advanced neural artistic networks.";
    } else if (chatPersona === "analyst") {
      systemInstruction = "You are PraBin DataMind, a rigorous data analyst and researcher powered by advanced neural logic networks.";
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          systemInstruction,
          useSearch,
          useMaps,
          model: chatPersona === "coder" ? "gemini-4-argon" : "gemini-3.8-flash",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to respond");

      const finalMessages: Message[] = [
        ...updatedMessages,
        {
          role: "assistant",
          content: data.text,
          groundingMetadata: data.groundingMetadata,
        },
      ];

      setSessions((prev) =>
        prev.map((s) => (s.id === currentSessionId ? { ...s, messages: finalMessages } : s))
      );
    } catch (err: any) {
      const errorMessages: Message[] = [
        ...updatedMessages,
        { role: "assistant", content: `Neural Error: ${err.message || "Connection interrupted."}` },
      ];
      setSessions((prev) =>
        prev.map((s) => (s.id === currentSessionId ? { ...s, messages: errorMessages } : s))
      );
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() && !editImageFile) return;

    setImageLoading(true);
    setGeneratedImageUrl(null);
    setImageDescription("");

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageAspectRatio,
          imageSize: imageSize,
          sourceImage: editImageFile,
          editPrompt: editPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");

      setGeneratedImageUrl(data.imageUrl);
      setImageDescription(data.description || "");
    } catch (err: any) {
      alert(`Image Generation Failed: ${err.message}`);
    } finally {
      setImageLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      setEditImageFile({
        data: base64String,
        mimeType: file.type || "image/png",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() || musicLoading) return;

    setMusicLoading(true);
    setGeneratedAudioUrl(null);
    setMusicLyrics("");

    try {
      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: musicPrompt,
          durationType: musicDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Music generation failed");

      setGeneratedAudioUrl(data.audioDataUrl);
      setMusicLyrics(data.lyrics || "");
    } catch (err: any) {
      alert(`Music Generation Failed: ${err.message}`);
    } finally {
      setMusicLoading(false);
    }
  };

  const handleIntelligenceRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intelligenceContent.trim() || intelligenceLoading) return;

    setIntelligenceLoading(true);
    setIntelligenceResult("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: intelligenceContent,
          taskType: intelligenceTask,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setIntelligenceResult(data.result);
    } catch (err: any) {
      setIntelligenceResult(`Error: ${err.message}`);
    } finally {
      setIntelligenceLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen w-screen bg-[#171717] text-[#ececec] font-sans overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Sidebar (ChatGPT Style) */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-[#171717] border-r border-[#2f2f2f] flex flex-col transition-all duration-300 overflow-hidden shrink-0 z-20`}
      >
        <div className="p-3 flex items-center justify-between border-b border-[#2f2f2f]">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center gap-2 bg-[#212121] hover:bg-[#2f2f2f] border border-[#333] px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl hover:bg-[#2f2f2f] text-neutral-400 hover:text-white ml-2 transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tools */}
        <div className="px-3 py-2 border-b border-[#2f2f2f] space-y-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "chat" ? "bg-[#2f2f2f] text-white" : "text-neutral-400 hover:bg-[#212121] hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span>Neural Nexus Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("studio")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "studio" ? "bg-[#2f2f2f] text-white" : "text-neutral-400 hover:bg-[#212121] hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span>Neural Studio (Images)</span>
          </button>
          <button
            onClick={() => setActiveTab("music")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "music" ? "bg-[#2f2f2f] text-white" : "text-neutral-400 hover:bg-[#212121] hover:text-white"
            }`}
          >
            <Music className="w-4 h-4 text-pink-400" />
            <span>Lyria Sound Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("intelligence")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "intelligence" ? "bg-[#2f2f2f] text-white" : "text-neutral-400 hover:bg-[#212121] hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Intelligence Hub</span>
          </button>
        </div>

        {/* Chat History Sessions */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase px-3 py-1 tracking-wider">Recent Chats</div>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setCurrentSessionId(s.id);
                setActiveTab("chat");
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate transition-colors ${
                currentSessionId === s.id && activeTab === "chat"
                  ? "bg-[#2f2f2f] text-white font-medium"
                  : "text-neutral-400 hover:bg-[#212121] hover:text-white"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* User / PraBin Profile Footer */}
        <div className="p-3 border-t border-[#2f2f2f] flex items-center gap-3 bg-[#171717]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-black text-xs shadow">
            PB
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate text-white">PraBin Assistant</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Neural Net Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full bg-[#212121] relative overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-[#2f2f2f] px-4 flex items-center justify-between bg-[#212121]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-[#2f2f2f] text-neutral-400 hover:text-white transition-colors"
                title="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-400" />
                PraBin 4.2
              </span>
              <span className="text-neutral-500">•</span>
              <span className="text-xs text-neutral-400">Custom Neural Intelligence</span>
            </div>
          </div>

          {activeTab === "chat" && (
            <div className="flex items-center gap-3">
              <select
                value={chatPersona}
                onChange={(e) => setChatPersona(e.target.value)}
                className="bg-[#171717] border border-[#333] text-xs text-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="general">PraBin Assistant</option>
                <option value="coder">PraBin CodeCore (Coder)</option>
                <option value="creative">PraBin Muse (Creative)</option>
                <option value="analyst">PraBin DataMind (Analyst)</option>
              </select>

              <div className="hidden md:flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs bg-[#171717] border border-[#333] px-2.5 py-1.5 rounded-lg cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={useSearch}
                    onChange={(e) => setUseSearch(e.target.checked)}
                    className="rounded bg-[#212121] border-neutral-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>Search</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs bg-[#171717] border border-[#333] px-2.5 py-1.5 rounded-lg cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={useMaps}
                    onChange={(e) => setUseMaps(e.target.checked)}
                    className="rounded bg-[#212121] border-neutral-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span>Maps</span>
                </label>
              </div>
            </div>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* TAB 1: CHAT (CHATGPT STYLE) */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {currentSession.messages.length === 1 && (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto text-black shadow-lg">
                        <Brain className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-white">What can I help with today?</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 max-w-lg mx-auto">
                        <button
                          onClick={() => handleSendMessage(undefined, "Explain quantum computing in simple terms")}
                          className="p-3 bg-[#171717] hover:bg-[#2f2f2f] border border-[#2f2f2f] rounded-xl text-left text-xs text-neutral-300 transition-colors"
                        >
                          <span className="font-semibold block text-white mb-1">Explain quantum computing</span>
                          <span className="text-neutral-500">In simple terms with neural analogies</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage(undefined, "Write a React component for a cyberpunk dashboard")}
                          className="p-3 bg-[#171717] hover:bg-[#2f2f2f] border border-[#2f2f2f] rounded-xl text-left text-xs text-neutral-300 transition-colors"
                        >
                          <span className="font-semibold block text-white mb-1">Write React dashboard</span>
                          <span className="text-neutral-500">With Tailwind CSS and Lucide icons</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {currentSession.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-4 max-w-3xl mx-auto ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-black shrink-0 font-bold text-xs shadow">
                          PB
                        </div>
                      )}
                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[85%] ${
                          msg.role === "user"
                            ? "bg-[#2f2f2f] text-white rounded-tr-none"
                            : "bg-[#171717] border border-[#2f2f2f] text-neutral-100 rounded-tl-none shadow-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>

                        {msg.groundingMetadata?.webSearchQueries && (
                          <div className="mt-3 pt-3 border-t border-neutral-800 text-xs text-cyan-400 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            <span>Searched: {msg.groundingMetadata.webSearchQueries.join(", ")}</span>
                          </div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-white shrink-0 font-bold text-xs shadow">
                          YOU
                        </div>
                      )}
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex gap-4 max-w-3xl mx-auto">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-black shrink-0 animate-pulse">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="p-4 rounded-2xl bg-[#171717] border border-[#2f2f2f] text-neutral-300 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span className="text-xs">PraBin neural network is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Bottom Input Box (ChatGPT Style) */}
              <div className="p-4 bg-[#212121] border-t border-[#2f2f2f]">
                <form onSubmit={(e) => handleSendMessage(e)} className="max-w-3xl mx-auto relative">
                  <div className="bg-[#171717] border border-[#333] rounded-2xl p-3 focus-within:border-emerald-500 shadow-lg">
                    <textarea
                      rows={2}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Message PraBin..."
                      className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-[#2f2f2f]/60 mt-2">
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="hidden sm:inline">Powered by custom neural networks</span>
                      </div>
                      <button
                        type="submit"
                        disabled={chatLoading || !inputMessage.trim()}
                        className="bg-white hover:bg-neutral-200 disabled:opacity-40 text-black p-2 rounded-xl transition-all cursor-pointer shadow"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: NEURAL STUDIO (IMAGES) */}
          {activeTab === "studio" && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
              <div className="w-full lg:w-96 bg-[#171717] p-6 rounded-2xl border border-[#2f2f2f] flex flex-col gap-5 shadow-xl">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-purple-400">
                    <ImageIcon className="w-5 h-5" />
                    Neural Studio
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Generate high-definition imagery and edit visuals with custom generative models.
                  </p>
                </div>

                <form onSubmit={handleGenerateImage} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Image Prompt</label>
                    <textarea
                      rows={3}
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="A cinematic cyberpunk city with glowing neon holograms..."
                      className="w-full bg-[#212121] border border-[#333] rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">Aspect Ratio</label>
                      <select
                        value={imageAspectRatio}
                        onChange={(e) => setImageAspectRatio(e.target.value)}
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="1:1">1:1 Square</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="4:3">4:3 Standard</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">Resolution</label>
                      <select
                        value={imageSize}
                        onChange={(e) => setImageSize(e.target.value)}
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500"
                      >
                        <option value="1K">1K High Def</option>
                        <option value="2K">2K Ultra HD</option>
                        <option value="4K">4K Cinematic</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-[#2f2f2f] pt-4">
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Optional Source Image (Editing)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 cursor-pointer"
                    />
                  </div>

                  {editImageFile && (
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">Edit Instructions</label>
                      <input
                        type="text"
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Add a glowing neural halo..."
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={imageLoading || (!imagePrompt.trim() && !editImageFile)}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer mt-2"
                  >
                    {imageLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Rendering Pixels...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Image</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="flex-1 bg-[#171717] rounded-2xl border border-[#2f2f2f] p-6 flex items-center justify-center relative min-h-[400px]">
                {imageLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    <p className="text-sm text-neutral-400 font-medium">PraBin neural renderer is working...</p>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="flex flex-col items-center gap-4 max-w-2xl w-full">
                    <div className="relative rounded-xl overflow-hidden border border-neutral-800 shadow-2xl max-h-[500px]">
                      <img src={generatedImageUrl} alt="Generated" className="w-full h-auto object-contain" />
                    </div>
                    {imageDescription && <p className="text-xs text-neutral-300 italic text-center">{imageDescription}</p>}
                    <a
                      href={generatedImageUrl}
                      download="prabin-studio-image.png"
                      className="flex items-center gap-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white px-5 py-2.5 rounded-xl text-xs font-medium border border-neutral-700 transition-all"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                      <span>Download HD Image</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-[#212121] border border-[#333] flex items-center justify-center mx-auto text-purple-400 shadow-inner">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold text-neutral-200">No Image Rendered Yet</h3>
                    <p className="text-xs text-neutral-500 max-w-sm">
                      Enter a prompt on the left and generate stunning visual art.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LYRIA SOUND STUDIO */}
          {activeTab === "music" && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
              <div className="w-full lg:w-96 bg-[#171717] p-6 rounded-2xl border border-[#2f2f2f] flex flex-col gap-5 shadow-xl">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-pink-400">
                    <Music className="w-5 h-5" />
                    Lyria Sound Studio
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Compose professional musical soundtracks with Lyria models.
                  </p>
                </div>

                <form onSubmit={handleGenerateMusic} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Musical Vibe & Prompt</label>
                    <textarea
                      rows={3}
                      value={musicPrompt}
                      onChange={(e) => setMusicPrompt(e.target.value)}
                      placeholder="Cinematic electronic ambient track with deep bass..."
                      className="w-full bg-[#212121] border border-[#333] rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Duration / Model</label>
                    <select
                      value={musicDuration}
                      onChange={(e) => setMusicDuration(e.target.value as any)}
                      className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-pink-500"
                    >
                      <option value="clip">Lyria Clip (30s Preview)</option>
                      <option value="pro">Lyria Pro (Full-Length Track)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={musicLoading || !musicPrompt.trim()}
                    className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 transition-all cursor-pointer mt-2"
                  >
                    {musicLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Composing Track...</span>
                      </>
                    ) : (
                      <>
                        <Music className="w-4 h-4" />
                        <span>Generate Sound Track</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="flex-1 bg-[#171717] rounded-2xl border border-[#2f2f2f] p-6 flex items-center justify-center relative min-h-[400px]">
                {musicLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
                    <p className="text-sm text-neutral-400 font-medium">Lyria neural composer is arranging audio...</p>
                  </div>
                ) : generatedAudioUrl ? (
                  <div className="flex flex-col items-center gap-6 max-w-lg w-full bg-[#212121] p-6 rounded-2xl border border-[#333] shadow-xl">
                    <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                      <Music className="w-8 h-8 animate-bounce" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-white">Audio Track Composed</h3>
                      <p className="text-xs text-neutral-400 mt-1">Ready for playback</p>
                    </div>
                    <audio controls src={generatedAudioUrl} className="w-full accent-pink-500" />
                    {musicLyrics && (
                      <div className="w-full bg-[#171717] p-4 rounded-xl border border-[#333] text-xs text-neutral-300 max-h-40 overflow-y-auto">
                        <span className="font-semibold text-pink-400 block mb-1">Generated Notes / Lyrics:</span>
                        <p className="whitespace-pre-wrap">{musicLyrics}</p>
                      </div>
                    )}
                    <a
                      href={generatedAudioUrl}
                      download="prabin-track.mp3"
                      className="flex items-center gap-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white px-5 py-2.5 rounded-xl text-xs font-medium border border-neutral-700 transition-all"
                    >
                      <Download className="w-4 h-4 text-pink-400" />
                      <span>Download Audio</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-[#212121] border border-[#333] flex items-center justify-center mx-auto text-pink-400">
                      <Music className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold text-neutral-200">No Audio Track Composed</h3>
                    <p className="text-xs text-neutral-500 max-w-sm">Enter a musical prompt to synthesize audio.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: INTELLIGENCE HUB */}
          {activeTab === "intelligence" && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
              <div className="w-full lg:w-1/2 bg-[#171717] p-6 rounded-2xl border border-[#2f2f2f] flex flex-col gap-5 shadow-xl">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-amber-400">
                    <Sparkles className="w-5 h-5" />
                    Intelligence Hub
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Advanced summarization, rigorous code reviews, and rewriting powered by Gemini-4-Argon.
                  </p>
                </div>

                <form onSubmit={handleIntelligenceRun} className="flex flex-col gap-4 flex-1">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Analysis Task</label>
                    <select
                      value={intelligenceTask}
                      onChange={(e) => setIntelligenceTask(e.target.value as any)}
                      className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="summarize">Advanced Summarization & Key Points</option>
                      <option value="code-review">Elite Code Review & Security Audit</option>
                      <option value="rewrite">Professional Rewrite & Polish</option>
                    </select>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Source Content / Code</label>
                    <textarea
                      rows={8}
                      value={intelligenceContent}
                      onChange={(e) => setIntelligenceContent(e.target.value)}
                      placeholder="Paste text, documentation, or code here..."
                      className="w-full flex-1 bg-[#212121] border border-[#333] rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={intelligenceLoading || !intelligenceContent.trim()}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                  >
                    {intelligenceLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing Content...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        <span>Execute Intelligence</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="w-full lg:w-1/2 bg-[#171717] rounded-2xl border border-[#2f2f2f] p-6 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-[#2f2f2f] mb-4">
                  <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    Neural Analysis Output
                  </h3>
                  {intelligenceResult && (
                    <button
                      onClick={() => copyToClipboard(intelligenceResult)}
                      className="flex items-center gap-1.5 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-xs px-3 py-1.5 rounded-lg text-neutral-200 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 bg-[#212121] rounded-xl border border-[#333] p-4 overflow-y-auto font-mono text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {intelligenceLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-neutral-400">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      <span>Processing neural logic...</span>
                    </div>
                  ) : intelligenceResult ? (
                    intelligenceResult
                  ) : (
                    <span className="text-neutral-600 italic">
                      Output will appear here after executing analysis...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
