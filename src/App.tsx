import React, { useState, useRef, useEffect } from "react";
import {
  Brain,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  Music,
  Video,
  Globe,
  MapPin,
  Send,
  Loader2,
  Download,
  Copy,
  Check,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Volume2,
  VolumeX,
  Terminal,
  Zap,
  Play,
  Share2,
  AlertCircle,
  Film,
  FileCode,
  Layers,
  Flame,
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
  const [activeTab, setActiveTab] = useState<"chat" | "studio" | "video" | "music" | "intelligence">("chat");

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "New Neural Conversation",
      messages: [
        {
          role: "assistant",
          content: "Hello! I am PraBin, your ultra-fast intelligent personal assistant powered by custom neural networks. How can I assist you today?",
        },
      ],
    },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState("1");
  const [inputMessage, setInputMessage] = useState("");
  const [chatPersona, setChatPersona] = useState<"general" | "coder" | "creative" | "analyst">("general");
  const [speedModel, setSpeedModel] = useState<"gemini-3.1-flash-lite" | "gemini-3.8-flash" | "gemini-4-argon">("gemini-3.1-flash-lite");
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Studio (Image Gen) state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageAspectRatio, setImageAspectRatio] = useState("1:1");
  const [imageSize, setImageSize] = useState("1K");
  const [imageQuality, setImageQuality] = useState<"fast" | "hd">("fast");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [editImageFile, setEditImageFile] = useState<{ data: string; mimeType: string } | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  // Video (Omni Flash) state
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [videoDuration, setVideoDuration] = useState("5s");
  const [videoSourceImage, setVideoSourceImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // Music state
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicDuration, setMusicDuration] = useState<"clip" | "pro">("clip");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [musicLyrics, setMusicLyrics] = useState("");
  const [musicLoading, setMusicLoading] = useState(false);

  // Intelligence state
  const [intelligenceContent, setIntelligenceContent] = useState("");
  const [intelligenceTask, setIntelligenceTask] = useState<"summarize" | "code-review" | "rewrite">("summarize");
  const [intelligenceSpeed, setIntelligenceSpeed] = useState<"fast" | "deep">("fast");
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
          content: "Hello! I am PraBin, your ultra-fast intelligent personal assistant powered by custom neural networks. What shall we explore today?",
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setActiveTab("chat");
    setChatError(null);
  };

  // Ultra-Fast Streaming Chat
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || chatLoading) return;

    if (!customText) setInputMessage("");
    setChatError(null);

    const historyToSend = currentSession.messages.slice(0, currentSession.messages.length);
    const updatedMessages: Message[] = [...currentSession.messages, { role: "user", content: textToSend }];

    // Auto update session title on first message
    const updatedSessions = sessions.map((s) => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          title: s.messages.length <= 1 ? textToSend.slice(0, 32) + (textToSend.length > 32 ? "..." : "") : s.title,
          messages: [...updatedMessages, { role: "assistant" as const, content: "" }],
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setChatLoading(true);

    let systemInstruction = "You are PraBin, an ultra-fast intelligent personal assistant powered by custom neural networks. Deliver lightning-fast, high-quality, precise responses.";
    if (chatPersona === "coder") {
      systemInstruction = "You are PraBin CodeCore, an elite AI software architect powered by custom neural networks. Write ultra-clean, efficient TypeScript, React, and Python code.";
    } else if (chatPersona === "creative") {
      systemInstruction = "You are PraBin Muse, a creative writer and concept generator powered by advanced generative neural models.";
    } else if (chatPersona === "analyst") {
      systemInstruction = "You are PraBin DataMind, a data researcher and analyst powered by neural logic networks.";
    }

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyToSend,
          systemInstruction,
          useSearch,
          useMaps,
          model: speedModel,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body received from server");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = "";
      let accumulatedText = "";
      let groundingMeta: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                accumulatedText += parsed.text;
                // Live update assistant response
                setSessions((prev) =>
                  prev.map((s) => {
                    if (s.id === currentSessionId) {
                      const msgs = [...s.messages];
                      msgs[msgs.length - 1] = {
                        role: "assistant",
                        content: accumulatedText,
                      };
                      return { ...s, messages: msgs };
                    }
                    return s;
                  })
                );
              }
              if (parsed.done) {
                groundingMeta = parsed.groundingMetadata;
                if (parsed.fullText) accumulatedText = parsed.fullText;
              }
            } catch (err: any) {
              console.warn("Parse stream chunk error:", err);
            }
          }
        }
      }

      // Finalize message with grounding metadata
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            const msgs = [...s.messages];
            msgs[msgs.length - 1] = {
              role: "assistant",
              content: accumulatedText || "Response processed.",
              groundingMetadata: groundingMeta,
            };
            return { ...s, messages: msgs };
          }
          return s;
        })
      );
    } catch (err: any) {
      console.error("Chat error:", err);
      setChatError(err.message || "Failed to receive response");
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            const msgs = [...s.messages];
            msgs[msgs.length - 1] = {
              role: "assistant",
              content: `Neural connection notice: ${err.message || "Could not complete response"}. Please check your connection or switch to Flash Lite for higher speed.`,
            };
            return { ...s, messages: msgs };
          }
          return s;
        })
      );
    } finally {
      setChatLoading(false);
    }
  };

  // Text-To-Speech
  const handleSpeak = async (text: string, idx: number) => {
    if (speakingIdx === idx) {
      window.speechSynthesis?.cancel();
      setSpeakingIdx(null);
      return;
    }

    setSpeakingIdx(idx);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.onended = () => setSpeakingIdx(null);
        audio.onerror = () => {
          fallbackSpeech(text);
        };
        audio.play().catch(() => fallbackSpeech(text));
      } else {
        fallbackSpeech(text);
      }
    } catch {
      fallbackSpeech(text);
    }
  };

  const fallbackSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 300));
      utterance.onend = () => setSpeakingIdx(null);
      utterance.onerror = () => setSpeakingIdx(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeakingIdx(null);
    }
  };

  // Image Generation
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
          quality: imageQuality,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");

      setGeneratedImageUrl(data.imageUrl);
      setImageDescription(data.description || "");
    } catch (err: any) {
      alert(`Image Generation Notice: ${err.message}`);
    } finally {
      setImageLoading(false);
    }
  };

  // Video Generation / Animation
  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim() && !videoSourceImage) return;

    setVideoLoading(true);
    setGeneratedVideoUrl(null);

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          sourceImage: videoSourceImage,
          aspectRatio: videoAspectRatio,
          duration: videoDuration,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Video generation failed");

      setGeneratedVideoUrl(data.videoUrl);
    } catch (err: any) {
      alert(`Video Generation Notice: ${err.message}`);
    } finally {
      setVideoLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "edit" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      const payload = {
        data: base64String,
        mimeType: file.type || "image/png",
      };
      if (target === "edit") setEditImageFile(payload);
      else setVideoSourceImage(payload);
    };
    reader.readAsDataURL(file);
  };

  // Music Generation
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
      alert(`Music Generation Notice: ${err.message}`);
    } finally {
      setMusicLoading(false);
    }
  };

  // Intelligence Hub
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
          speed: intelligenceSpeed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setIntelligenceResult(data.result);
    } catch (err: any) {
      setIntelligenceResult(`Analysis Notice: ${err.message}`);
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
            className="flex-1 flex items-center gap-2 bg-[#212121] hover:bg-[#2f2f2f] border border-[#333] px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl hover:bg-[#2f2f2f] text-neutral-400 hover:text-white ml-2 transition-colors cursor-pointer"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Tools */}
        <div className="px-3 py-2 border-b border-[#2f2f2f] space-y-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "chat" ? "bg-[#2f2f2f] text-white" : "text-neutral-400 hover:bg-[#212121] hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Neural Nexus Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("studio")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "studio" ? "bg-[#2f2f2f] text-white" : "text-neutral-400 hover:bg-[#212121] hover:text-white"
            }`}
          >
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span>Neural Image Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "video" ? "bg-[#2f2f2f] text-white" : "text-neutral-400 hover:bg-[#212121] hover:text-white"
            }`}
          >
            <Film className="w-4 h-4 text-cyan-400" />
            <span>Omni Video Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("music")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "music" ? "bg-[#2f2f2f] text-white" : "text-neutral-400 hover:bg-[#212121] hover:text-white"
            }`}
          >
            <Music className="w-4 h-4 text-pink-400" />
            <span>Lyria Sound Studio</span>
          </button>
          <button
            onClick={() => setActiveTab("intelligence")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
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
                  ? "bg-[#2f2f2f] text-white font-medium shadow-sm"
                  : "text-neutral-400 hover:bg-[#212121] hover:text-white"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* User / PraBin Profile Footer */}
        <div className="p-3 border-t border-[#2f2f2f] flex items-center gap-3 bg-[#171717]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center font-bold text-black text-xs shadow">
            PB
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate text-white">PraBin Assistant</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Ultra-Fast Neural Core</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full bg-[#212121] relative overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-[#2f2f2f] px-4 flex items-center justify-between bg-[#212121]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-[#2f2f2f] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-400" />
                PraBin
              </span>
              <span className="text-neutral-600">•</span>
              <span className="text-xs text-neutral-400">Intelligent Neural Assistant</span>
            </div>
          </div>

          {activeTab === "chat" && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Ultra-Fast Model Selector */}
              <div className="flex items-center bg-[#171717] border border-[#333] rounded-xl p-0.5 text-xs">
                <button
                  onClick={() => setSpeedModel("gemini-3.1-flash-lite")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    speedModel === "gemini-3.1-flash-lite"
                      ? "bg-emerald-500 text-black font-semibold shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Flash Lite: Instant sub-second response"
                >
                  <Zap className="w-3 h-3" />
                  <span className="hidden sm:inline">Ultra-Fast</span>
                </button>
                <button
                  onClick={() => setSpeedModel("gemini-3.8-flash")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    speedModel === "gemini-3.8-flash"
                      ? "bg-emerald-500 text-black font-semibold shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Flash 3.8: Balanced reasoning"
                >
                  <Brain className="w-3 h-3" />
                  <span className="hidden sm:inline">Balanced</span>
                </button>
                <button
                  onClick={() => setSpeedModel("gemini-4-argon")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                    speedModel === "gemini-4-argon"
                      ? "bg-emerald-500 text-black font-semibold shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Argon 4: Complex tasks and deep code"
                >
                  <Flame className="w-3 h-3" />
                  <span className="hidden sm:inline">Deep</span>
                </button>
              </div>

              {/* Persona selector */}
              <select
                value={chatPersona}
                onChange={(e) => setChatPersona(e.target.value as any)}
                className="bg-[#171717] border border-[#333] text-xs text-neutral-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="general">PraBin Assistant</option>
                <option value="coder">CodeCore (Elite Coder)</option>
                <option value="creative">Muse (Creative)</option>
                <option value="analyst">DataMind (Analyst)</option>
              </select>

              {/* Grounding toggles */}
              <div className="hidden lg:flex items-center gap-1.5">
                <button
                  onClick={() => setUseSearch(!useSearch)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    useSearch
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium"
                      : "bg-[#171717] border-[#333] text-neutral-400 hover:text-white"
                  }`}
                >
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>Search</span>
                </button>

                <button
                  onClick={() => setUseMaps(!useMaps)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                    useMaps
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300 font-medium"
                      : "bg-[#171717] border-[#333] text-neutral-400 hover:text-white"
                  }`}
                >
                  <MapPin className="w-3 h-3 text-rose-400" />
                  <span>Maps</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* TAB 1: CHAT (CHATGPT STYLE WITH LIVE STREAMING) */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  {chatError && (
                    <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{chatError}</span>
                      </div>
                      <button
                        onClick={() => setChatError(null)}
                        className="text-neutral-400 hover:text-white text-xs"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {currentSession.messages.length === 1 && (
                    <div className="text-center py-10 space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center mx-auto text-black shadow-lg shadow-emerald-500/10">
                        <Brain className="w-7 h-7" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">How can PraBin help you today?</h2>
                        <p className="text-xs text-neutral-400 mt-1">Real-time neural processing with streaming speed and deep intelligence.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 max-w-lg mx-auto">
                        <button
                          onClick={() => handleSendMessage(undefined, "Explain how neural networks process multi-modal tokens at scale.")}
                          className="p-3 bg-[#171717] hover:bg-[#2a2a2a] border border-[#2f2f2f] rounded-xl text-left text-xs text-neutral-300 transition-colors shadow-sm"
                        >
                          <span className="font-semibold block text-white mb-0.5">Neural Network Architecture</span>
                          <span className="text-neutral-500">How models process multi-modal tokens</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage(undefined, "Generate a production-ready React hook for real-time WebSockets.")}
                          className="p-3 bg-[#171717] hover:bg-[#2a2a2a] border border-[#2f2f2f] rounded-xl text-left text-xs text-neutral-300 transition-colors shadow-sm"
                        >
                          <span className="font-semibold block text-white mb-0.5">CodeCore Architecture</span>
                          <span className="text-neutral-500">Production TypeScript React hook</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage(undefined, "What are the latest breakthroughs in renewable energy this year?")}
                          className="p-3 bg-[#171717] hover:bg-[#2a2a2a] border border-[#2f2f2f] rounded-xl text-left text-xs text-neutral-300 transition-colors shadow-sm"
                        >
                          <span className="font-semibold block text-white mb-0.5">Deep Research & Grounding</span>
                          <span className="text-neutral-500">Breakthroughs in renewable energy</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage(undefined, "Compose a futuristic sci-fi screenplay scene with dialogue.")}
                          className="p-3 bg-[#171717] hover:bg-[#2a2a2a] border border-[#2f2f2f] rounded-xl text-left text-xs text-neutral-300 transition-colors shadow-sm"
                        >
                          <span className="font-semibold block text-white mb-0.5">Creative Muse Engine</span>
                          <span className="text-neutral-500">Sci-fi dialogue and narrative scene</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {currentSession.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 max-w-3xl mx-auto ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-black shrink-0 font-bold text-xs shadow">
                          PB
                        </div>
                      )}
                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[85%] group relative ${
                          msg.role === "user"
                            ? "bg-[#2f2f2f] text-white rounded-tr-none"
                            : "bg-[#171717] border border-[#2f2f2f] text-neutral-100 rounded-tl-none shadow-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content || (chatLoading && idx === currentSession.messages.length - 1 ? "..." : "")}</div>

                        {msg.groundingMetadata?.webSearchQueries && (
                          <div className="mt-3 pt-3 border-t border-neutral-800 text-xs text-cyan-400 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            <span>Grounding Search: {msg.groundingMetadata.webSearchQueries.join(", ")}</span>
                          </div>
                        )}

                        {/* Action buttons (Copy, Read Aloud) */}
                        {msg.role === "assistant" && msg.content && (
                          <div className="mt-2 pt-2 flex items-center gap-2 border-t border-neutral-800/60 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyToClipboard(msg.content)}
                              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                              title="Copy response"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copied ? "Copied" : "Copy"}</span>
                            </button>
                            <span className="text-neutral-700">•</span>
                            <button
                              onClick={() => handleSpeak(msg.content, idx)}
                              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                              title="Listen to response"
                            >
                              {speakingIdx === idx ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                                  <span className="text-rose-400">Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Speak</span>
                                </>
                              )}
                            </button>
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

                  {chatLoading && currentSession.messages[currentSession.messages.length - 1]?.content === "" && (
                    <div className="flex gap-3 max-w-3xl mx-auto">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-black shrink-0 animate-pulse">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="p-4 rounded-2xl bg-[#171717] border border-[#2f2f2f] text-neutral-300 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span className="text-xs">PraBin streaming response at high speed...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Bottom Input Box (ChatGPT Style) */}
              <div className="p-4 bg-[#212121] border-t border-[#2f2f2f]">
                <form onSubmit={(e) => handleSendMessage(e)} className="max-w-3xl mx-auto relative">
                  <div className="bg-[#171717] border border-[#333] rounded-2xl p-3 focus-within:border-emerald-500 shadow-lg transition-colors">
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
                      placeholder="Message PraBin... (Press Enter to send)"
                      className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none"
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-[#2f2f2f]/60 mt-1">
                      <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Stream Active</span>
                        </span>
                        <span className="text-neutral-600 hidden sm:inline">•</span>
                        <span className="text-neutral-500 hidden sm:inline">
                          Model: {speedModel === "gemini-3.1-flash-lite" ? "Ultra-Fast Flash Lite" : speedModel === "gemini-3.8-flash" ? "Flash 3.8 Balanced" : "Argon 4 Deep"}
                        </span>
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

          {/* TAB 2: NEURAL IMAGE STUDIO */}
          {activeTab === "studio" && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
              <div className="w-full lg:w-96 bg-[#171717] p-6 rounded-2xl border border-[#2f2f2f] flex flex-col gap-4 shadow-xl">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-purple-400">
                    <ImageIcon className="w-5 h-5" />
                    Neural Image Studio
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Generate high-resolution artwork or edit photos with neural filters.
                  </p>
                </div>

                <form onSubmit={handleGenerateImage} className="flex flex-col gap-4">
                  {/* Speed vs Ultra Quality toggle */}
                  <div className="flex items-center justify-between bg-[#212121] p-1 rounded-xl border border-[#333] text-xs">
                    <button
                      type="button"
                      onClick={() => setImageQuality("fast")}
                      className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                        imageQuality === "fast" ? "bg-purple-600 text-white shadow" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      ⚡ Fast Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageQuality("hd")}
                      className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                        imageQuality === "hd" ? "bg-purple-600 text-white shadow" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      ✨ Ultra HD (1K-4K)
                    </button>
                  </div>

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
                        disabled={imageQuality === "fast"}
                        onChange={(e) => setImageSize(e.target.value)}
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                      >
                        <option value="1K">1K High Def</option>
                        <option value="2K">2K Ultra HD</option>
                        <option value="4K">4K Cinematic</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-[#2f2f2f] pt-3">
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Upload Photo to Edit</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "edit")}
                      className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 cursor-pointer"
                    />
                  </div>

                  {editImageFile && (
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">Edit Instruction</label>
                      <input
                        type="text"
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g. Add glowing neon rim light..."
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={imageLoading || (!imagePrompt.trim() && !editImageFile)}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer mt-1"
                  >
                    {imageLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Rendering Artwork...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Artwork</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="flex-1 bg-[#171717] rounded-2xl border border-[#2f2f2f] p-6 flex items-center justify-center relative min-h-[400px]">
                {imageLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                    <p className="text-sm text-neutral-400 font-medium">PraBin neural generator is synthesizing pixels...</p>
                  </div>
                ) : generatedImageUrl ? (
                  <div className="flex flex-col items-center gap-4 max-w-2xl w-full">
                    <div className="relative rounded-xl overflow-hidden border border-neutral-800 shadow-2xl max-h-[500px]">
                      <img src={generatedImageUrl} alt="Generated" className="w-full h-auto object-contain" />
                    </div>
                    {imageDescription && <p className="text-xs text-neutral-300 italic text-center">{imageDescription}</p>}
                    <a
                      href={generatedImageUrl}
                      download="prabin-image.png"
                      className="flex items-center gap-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white px-5 py-2.5 rounded-xl text-xs font-medium border border-neutral-700 transition-all shadow"
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
                    <p className="text-xs text-neutral-500 max-w-sm">Enter a prompt to create ultra-high-definition artwork.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OMNI VIDEO STUDIO (ANIMATE IMAGE & VIDEO GENERATION) */}
          {activeTab === "video" && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
              <div className="w-full lg:w-96 bg-[#171717] p-6 rounded-2xl border border-[#2f2f2f] flex flex-col gap-4 shadow-xl">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-cyan-400">
                    <Film className="w-5 h-5" />
                    Omni Video Studio
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Animate photos into videos or generate cinematic motion with Gemini Omni Flash.
                  </p>
                </div>

                <form onSubmit={handleGenerateVideo} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Upload Photo to Animate (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "video")}
                      className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 cursor-pointer"
                    />
                    {videoSourceImage && (
                      <span className="text-[11px] text-cyan-400 mt-1 block">✓ Image loaded as first video frame</span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Motion / Scene Prompt</label>
                    <textarea
                      rows={3}
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="Cinematic drone flying over mountain peaks at sunset with volumetric clouds..."
                      className="w-full bg-[#212121] border border-[#333] rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">Aspect Ratio</label>
                      <select
                        value={videoAspectRatio}
                        onChange={(e) => setVideoAspectRatio(e.target.value as any)}
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="16:9">16:9 Landscape</option>
                        <option value="9:16">9:16 Portrait / Reels</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">Duration</label>
                      <select
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(e.target.value)}
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="5s">5 Seconds</option>
                        <option value="10s">10 Seconds</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={videoLoading || (!videoPrompt.trim() && !videoSourceImage)}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer mt-1"
                  >
                    {videoLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Rendering Omni Video...</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        <span>Animate / Generate Video</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="flex-1 bg-[#171717] rounded-2xl border border-[#2f2f2f] p-6 flex items-center justify-center relative min-h-[400px]">
                {videoLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    <p className="text-sm text-neutral-400 font-medium">Gemini Omni Flash is synthesizing video frames...</p>
                  </div>
                ) : generatedVideoUrl ? (
                  <div className="flex flex-col items-center gap-4 max-w-2xl w-full">
                    <div className="relative rounded-xl overflow-hidden border border-neutral-800 shadow-2xl max-h-[500px]">
                      <video controls autoPlay loop src={generatedVideoUrl} className="w-full h-auto object-contain rounded-xl" />
                    </div>
                    <a
                      href={generatedVideoUrl}
                      download="prabin-omni-video.mp4"
                      className="flex items-center gap-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white px-5 py-2.5 rounded-xl text-xs font-medium border border-neutral-700 transition-all shadow"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                      <span>Download Video</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-[#212121] border border-[#333] flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                      <Film className="w-8 h-8" />
                    </div>
                    <h3 className="font-semibold text-neutral-200">No Video Rendered Yet</h3>
                    <p className="text-xs text-neutral-500 max-w-sm">Upload a photo to animate or enter a motion scene prompt.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LYRIA SOUND STUDIO */}
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
                      className="flex items-center gap-2 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white px-5 py-2.5 rounded-xl text-xs font-medium border border-neutral-700 transition-all shadow"
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

          {/* TAB 5: INTELLIGENCE HUB */}
          {activeTab === "intelligence" && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
              <div className="w-full lg:w-1/2 bg-[#171717] p-6 rounded-2xl border border-[#2f2f2f] flex flex-col gap-5 shadow-xl">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-amber-400">
                    <Sparkles className="w-5 h-5" />
                    Intelligence Hub
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Advanced summarization, rigorous code reviews, and rewriting.
                  </p>
                </div>

                <form onSubmit={handleIntelligenceRun} className="flex flex-col gap-4 flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">Analysis Task</label>
                      <select
                        value={intelligenceTask}
                        onChange={(e) => setIntelligenceTask(e.target.value as any)}
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="summarize">Summarization & Key Points</option>
                        <option value="code-review">Elite Code Review</option>
                        <option value="rewrite">Professional Rewrite</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-300 block mb-1">Processing Speed</label>
                      <select
                        value={intelligenceSpeed}
                        onChange={(e) => setIntelligenceSpeed(e.target.value as any)}
                        className="w-full bg-[#212121] border border-[#333] rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="fast">⚡ Ultra Fast (Flash Lite)</option>
                        <option value="deep">🔬 Deep Reasoning (Argon 4)</option>
                      </select>
                    </div>
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
                      className="flex items-center gap-1.5 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-xs px-3 py-1.5 rounded-lg text-neutral-200 transition-colors cursor-pointer"
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
