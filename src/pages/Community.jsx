import { useState, useEffect, useContext, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AuthContext, API } from "../App";
import Shop from "./Shop";
import StudyRoomList from "../components/StudyRoom/StudyRoomList";
import { toast } from "sonner";
import {
  serverSchema,
  commentSchema,
  communityNoteSchema,
  goalSchema,
  resourceSchema,
  formatZodErrors,
} from "../lib/validation";
import { 
  Plus, 
  Hash, 
  Send,
  Users,
  LogOut,
  Crown,
  Compass,
  FolderOpen,
  Target,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Sparkles,
  GraduationCap,
  LayoutList,
  Trophy,
  ShoppingBag,
  BookOpen
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export default function Community() {
  const { token, user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const communityTab = searchParams.get("tab") || "feed";
  const setCommunityTab = (value) => setSearchParams({ tab: value });
  const [servers, setServers] = useState([]);
  const [discoverServers, setDiscoverServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverDescription, setServerDescription] = useState("");
  
  // Enhanced features state
  const [resources, setResources] = useState([]);
  const [goals, setGoals] = useState([]);
  const [collaborativeNotes, setCollaborativeNotes] = useState([]);
  const [sidePanel, setSidePanel] = useState(null); // 'resources', 'goals', 'notes'
  const [resourceOpen, setResourceOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  
  // Resource form
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceType, setResourceType] = useState("link");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceContent, setResourceContent] = useState("");
  
  // Goal form
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTarget, setGoalTarget] = useState(100);
  
  // Note form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  
  // Academy form
  const [isAcademy, setIsAcademy] = useState(false);
  const [academyType, setAcademyType] = useState("university");
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Validation error states
  const [serverErrors, setServerErrors] = useState({});
  const [messageError, setMessageError] = useState("");
  const [noteErrors, setNoteErrors] = useState({});
  const [goalErrors, setGoalErrors] = useState({});
  const [resourceErrors, setResourceErrors] = useState({});
  
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const fetchServerResources = useCallback(async (serverId) => {
    try {
      const response = await axios.get(`${API}/servers/${serverId}/resources`, { headers, withCredentials: true });
      setResources(response.data);
    } catch (error) {
      console.error("Failed to load resources");
    }
  }, [headers]);

  const fetchServerGoals = useCallback(async (serverId) => {
    try {
      const response = await axios.get(`${API}/servers/${serverId}/goals`, { headers, withCredentials: true });
      setGoals(response.data);
    } catch (error) {
      console.error("Failed to load goals");
    }
  }, [headers]);

  const fetchCollaborativeNotes = useCallback(async (serverId) => {
    try {
      const response = await axios.get(`${API}/servers/${serverId}/notes`, { headers, withCredentials: true });
      setCollaborativeNotes(response.data);
    } catch (error) {
      console.error("Failed to load notes");
    }
  }, [headers]);

  const selectServer = useCallback(async (serverId) => {
    try {
      const response = await axios.get(`${API}/servers/${serverId}`, { headers, withCredentials: true });
      setSelectedServer(response.data);
      if (response.data.channels?.length > 0) {
        setSelectedChannel(response.data.channels[0]);
      }
      // Fetch enhanced data
      fetchServerResources(serverId);
      fetchServerGoals(serverId);
      fetchCollaborativeNotes(serverId);
    } catch (error) {
      toast.error("Failed to load server");
    }
  }, [headers, fetchServerResources, fetchServerGoals, fetchCollaborativeNotes]);

  const fetchServers = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/servers`, { headers, withCredentials: true });
      setServers(response.data);
      if (response.data.length > 0 && !selectedServer) {
        selectServer(response.data[0].server_id);
      }
    } catch (error) {
      toast.error("Failed to load servers");
    } finally {
      setLoading(false);
    }
  }, [headers, selectedServer, selectServer]);

  const fetchMessages = useCallback(async (channelId) => {
    try {
      const response = await axios.get(`${API}/channels/${channelId}/messages`, { headers, withCredentials: true });
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to load messages");
    }
  }, [headers]);

  const connectWebSocket = useCallback((channelId) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/ws/${channelId}?token=${token}`);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages(prev => [...prev, data.message]);
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };
    
    wsRef.current = ws;
  }, [token]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    if (selectedChannel && token) {
      fetchMessages(selectedChannel.channel_id);
      connectWebSocket(selectedChannel.channel_id);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedChannel, token, fetchMessages, connectWebSocket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchDiscoverServers = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/servers/discover/all`, { headers, withCredentials: true });
      setDiscoverServers(response.data);
    } catch (error) {
      toast.error("Failed to load servers");
    }
  }, [headers]);

  const handleAddResource = async () => {
    if (!selectedServer) return;
    setResourceErrors({});
    const result = resourceSchema.safeParse({
      title: resourceTitle,
      url: resourceUrl,
      content: resourceContent,
    });
    if (!result.success) {
      setResourceErrors(formatZodErrors(result.error));
      return;
    }
    
    try {
      await axios.post(`${API}/servers/${selectedServer.server_id}/resources`, {
        server_id: selectedServer.server_id,
        title: resourceTitle,
        resource_type: resourceType,
        url: resourceUrl || null,
        content: resourceContent || null
      }, { headers, withCredentials: true });
      
      fetchServerResources(selectedServer.server_id);
      setResourceTitle("");
      setResourceUrl("");
      setResourceContent("");
      setResourceOpen(false);
      toast.success("Resource added!");
    } catch (error) {
      toast.error("Failed to add resource");
    }
  };

  const handleAddGoal = async () => {
    if (!selectedServer) return;
    setGoalErrors({});
    const result = goalSchema.safeParse({
      title: goalTitle,
      description: goalDescription,
      target: parseInt(goalTarget) || 0,
    });
    if (!result.success) {
      setGoalErrors(formatZodErrors(result.error));
      return;
    }
    
    try {
      await axios.post(`${API}/servers/${selectedServer.server_id}/goals`, {
        server_id: selectedServer.server_id,
        title: goalTitle,
        description: goalDescription,
        target: parseInt(goalTarget)
      }, { headers, withCredentials: true });
      
      fetchServerGoals(selectedServer.server_id);
      setGoalTitle("");
      setGoalDescription("");
      setGoalTarget(100);
      setGoalOpen(false);
      toast.success("Goal created!");
    } catch (error) {
      toast.error("Failed to create goal");
    }
  };

  const handleContributeGoal = async (goalId, amount) => {
    try {
      await axios.post(`${API}/servers/${selectedServer.server_id}/goals/${goalId}/contribute`, {
        amount
      }, { headers, withCredentials: true });
      
      fetchServerGoals(selectedServer.server_id);
      toast.success("Contributed to goal!");
    } catch (error) {
      toast.error("Failed to contribute");
    }
  };

  const handleCreateNote = async () => {
    if (!selectedServer) return;
    setNoteErrors({});
    const result = communityNoteSchema.safeParse({ title: noteTitle, content: noteContent });
    if (!result.success) {
      setNoteErrors(formatZodErrors(result.error));
      return;
    }
    
    try {
      const response = await axios.post(`${API}/servers/${selectedServer.server_id}/notes`, {
        server_id: selectedServer.server_id,
        title: noteTitle,
        content: noteContent
      }, { headers, withCredentials: true });
      
      fetchCollaborativeNotes(selectedServer.server_id);
      setSelectedNote(response.data);
      setNoteTitle("");
      setNoteContent("");
      setNoteOpen(false);
      toast.success("Note created!");
    } catch (error) {
      toast.error("Failed to create note");
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote || !selectedServer) return;
    
    try {
      await axios.put(`${API}/servers/${selectedServer.server_id}/notes/${selectedNote.note_id}`, {
        content: selectedNote.content
      }, { headers, withCredentials: true });
      
      fetchCollaborativeNotes(selectedServer.server_id);
      toast.success("Note saved!");
    } catch (error) {
      toast.error("Failed to save note");
    }
  };

  const handleGetAISuggestions = async () => {
    if (!selectedServer) return;
    
    try {
      const response = await axios.post(`${API}/servers/${selectedServer.server_id}/ai-goals`, {}, { headers, withCredentials: true });
      toast.success("AI suggestions generated!");
      // You could show these in a modal or add them directly
      console.log(response.data);
    } catch (error) {
      toast.error("Failed to get suggestions");
    }
  };


  const handleCreateServer = async () => {
    setServerErrors({});
    const result = serverSchema.safeParse({ name: serverName, description: serverDescription });
    if (!result.success) {
      setServerErrors(formatZodErrors(result.error));
      return;
    }

    try {
      let response;
      if (isAcademy) {
        // Create Visionary Academy school server
        response = await axios.post(`${API}/servers/academy`, {
          name: serverName,
          description: serverDescription,
          school_type: academyType
        }, { headers, withCredentials: true });
      } else {
        response = await axios.post(`${API}/servers`, {
          name: serverName,
          description: serverDescription
        }, { headers, withCredentials: true });
      }
      
      setServers([...servers, response.data]);
      selectServer(response.data.server_id);
      setCreateServerOpen(false);
      setServerName("");
      setServerDescription("");
      setIsAcademy(false);
      toast.success(isAcademy ? "Visionary Academy created!" : "Server created!");
    } catch (error) {
      toast.error("Failed to create server");
    }
  };

  const handleJoinServer = async (serverId) => {
    try {
      await axios.post(`${API}/servers/${serverId}/join`, {}, { headers, withCredentials: true });
      fetchServers();
      selectServer(serverId);
      setDiscoverOpen(false);
      toast.success("Joined server!");
    } catch (error) {
      if (error.response?.data?.detail === "Already a member") {
        selectServer(serverId);
        setDiscoverOpen(false);
      } else {
        toast.error("Failed to join server");
      }
    }
  };

  const handleLeaveServer = async () => {
    if (!selectedServer) return;
    
    try {
      await axios.post(`${API}/servers/${selectedServer.server_id}/leave`, {}, { headers, withCredentials: true });
      setServers(servers.filter(s => s.server_id !== selectedServer.server_id));
      setSelectedServer(null);
      setSelectedChannel(null);
      toast.success("Left server");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to leave server");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedChannel) return;
    setMessageError("");
    const result = commentSchema.safeParse({ text: newMessage });
    if (!result.success) {
      setMessageError(result.error.errors[0]?.message || "Invalid message");
      return;
    }

    try {
      await axios.post(`${API}/channels/${selectedChannel.channel_id}/messages`, {
        content: newMessage,
        channel_id: selectedChannel.channel_id
      }, { headers, withCredentials: true });
      
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  if (loading) {
    return (
      <motion.div
        className="flex flex-1 flex overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
          {/* Server icon column skeleton */}
          <div className="w-[72px] bg-secondary/50 flex flex-col items-center py-4 gap-2 border-r border-border">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-12 h-12 rounded-2xl" delay={i * 50} />
            ))}
            <div className="w-8 h-0.5 bg-border my-2" />
            <Skeleton className="w-12 h-12 rounded-2xl" delay={220} />
            <Skeleton className="w-12 h-12 rounded-2xl" delay={270} />
          </div>

          {/* Channel list skeleton */}
          <div className="w-60 bg-card border-r border-border flex flex-col">
            <div className="p-4 border-b border-border space-y-2">
              <Skeleton className="h-4 w-32" delay={60} />
              <Skeleton className="h-3 w-24" delay={90} />
            </div>
            <div className="p-3 border-b border-border flex gap-1">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-8 flex-1 rounded-md" delay={100 + i * 30} />
              ))}
            </div>
            <div className="flex-1 p-2 space-y-1">
              <Skeleton className="h-2.5 w-24 mb-2" delay={160} />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4 rounded-sm shrink-0" delay={180 + i * 35} />
                  <Skeleton className="h-3 flex-1" delay={195 + i * 35} />
                </div>
              ))}
            </div>
          </div>

          {/* Main content — 9 server/message item skeletons */}
          <div className="flex-1 flex flex-col">
            {/* Channel header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Skeleton className="h-4 w-4 rounded-sm" delay={80} />
              <Skeleton className="h-4 w-28" delay={100} />
            </div>

            {/* Message area with 9 skeletons */}
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton circle className="h-9 w-9 shrink-0" delay={i * 40} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-24" delay={i * 40 + 15} />
                      <Skeleton className="h-2.5 w-12" delay={i * 40 + 30} />
                    </div>
                    <Skeleton
                      className="h-3"
                      style={{ width: `${55 + (i % 4) * 12}%` }}
                      delay={i * 40 + 45}
                    />
                    {i % 3 === 0 && (
                      <Skeleton className="h-3 w-2/5" delay={i * 40 + 70} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Message input skeleton */}
            <div className="p-4 border-t border-border">
              <Skeleton className="h-10 w-full rounded-xl" delay={300} />
            </div>
          </div>

      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-1 flex flex-col overflow-hidden min-h-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      data-testid="community-page"
    >
        <Tabs value={communityTab} onValueChange={setCommunityTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="shrink-0 mx-4 mt-2 grid w-full max-w-2xl grid-cols-4 h-11">
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <LayoutList className="w-4 h-4" /> Feed
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Study Rooms
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Leaderboard
            </TabsTrigger>
            <TabsTrigger value="shop" className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Shop
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rooms" className="flex-1 flex min-h-0 overflow-hidden mt-0 data-[state=active]:flex p-4">
            <StudyRoomList currentUser={user ? { id: user.user_id || user.id, name: user.name || user.email, avatar: user.avatar } : null} />
          </TabsContent>
          <TabsContent value="feed" className="flex-1 flex min-h-0 overflow-hidden mt-0 data-[state=active]:flex">
        <div className="w-[72px] bg-secondary/50 flex flex-col items-center py-4 gap-2 border-r border-border">
          {servers.map((server) => (
            <button
              key={server.server_id}
              onClick={() => selectServer(server.server_id)}
              className={`w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                selectedServer?.server_id === server.server_id 
                  ? "bg-primary text-primary-foreground rounded-xl" 
                  : "bg-muted hover:bg-accent"
              } flex items-center justify-center font-medium`}
              data-testid={`server-${server.server_id}`}
            >
              {server.icon || server.name.charAt(0).toUpperCase()}
            </button>
          ))}
          
          <div className="w-8 h-0.5 bg-border my-2"></div>
          
          {/* Create Server */}
          <Dialog open={createServerOpen} onOpenChange={setCreateServerOpen}>
            <DialogTrigger asChild>
              <button 
                className="w-12 h-12 rounded-2xl bg-muted hover:bg-green-500 hover:text-white transition-all hover:rounded-xl flex items-center justify-center"
                data-testid="create-server-btn"
              >
                <Plus className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Server</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Server Type Toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={!isAcademy ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setIsAcademy(false)}
                  >
                    <Users className="w-4 h-4 mr-2" /> Community
                  </Button>
                  <Button
                    type="button"
                    variant={isAcademy ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setIsAcademy(true)}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" /> Visionary Academy
                  </Button>
                </div>
                
                {isAcademy && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                    <p className="text-sm text-muted-foreground">
                      🎓 Create a school server with leaderboards, classes, and academic features
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>{isAcademy ? "School Name" : "Server Name"}</Label>
                  <Input
                    value={serverName}
                    onChange={(e) => { setServerName(e.target.value); setServerErrors((p) => ({ ...p, name: undefined })); }}
                    placeholder={isAcademy ? "Harvard Study Group" : "My Awesome Server"}
                    data-testid="server-name-input"
                    className={serverErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {serverErrors.name && (
                    <p className="text-xs text-destructive">{serverErrors.name}</p>
                  )}
                </div>
                
                {isAcademy && (
                  <div className="space-y-2">
                    <Label>School Type</Label>
                    <div className="flex gap-2">
                      {["high_school", "university", "other"].map(type => (
                        <Button
                          key={type}
                          type="button"
                          variant={academyType === type ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAcademyType(type)}
                        >
                          {type === "high_school" ? "High School" : type === "university" ? "University" : "Other"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={serverDescription}
                    onChange={(e) => { setServerDescription(e.target.value); setServerErrors((p) => ({ ...p, description: undefined })); }}
                    placeholder={isAcademy ? "What do you study?" : "What's your server about?"}
                    className={serverErrors.description ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {serverErrors.description && (
                    <p className="text-xs text-destructive">{serverErrors.description}</p>
                  )}
                </div>
                <Button onClick={handleCreateServer} className="w-full" data-testid="create-server-submit">
                  {isAcademy ? "Create Academy" : "Create Server"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Discover Servers */}
          <Dialog open={discoverOpen} onOpenChange={(open) => {
            setDiscoverOpen(open);
            if (open) fetchDiscoverServers();
          }}>
            <DialogTrigger asChild>
              <button 
                className="w-12 h-12 rounded-2xl bg-muted hover:bg-primary hover:text-primary-foreground transition-all hover:rounded-xl flex items-center justify-center"
                data-testid="discover-servers-btn"
              >
                <Compass className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Discover Servers</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {discoverServers.map((server) => (
                  <div 
                    key={server.server_id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {server.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{server.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {server.description || "No description"}
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleJoinServer(server.server_id)}
                      data-testid={`join-server-${server.server_id}`}
                    >
                      Join
                    </Button>
                  </div>
                ))}
                {discoverServers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No servers found. Create one!
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selectedServer ? (
          <>
            {/* Channel List with Tabs */}
            <div className="w-60 bg-card border-r border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <h2 className="font-heading font-semibold truncate">{selectedServer.name}</h2>
                {selectedServer.description && (
                  <p className="text-xs text-muted-foreground truncate">{selectedServer.description}</p>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="p-2 border-b border-border flex gap-1">
                <Button
                  variant={sidePanel === 'resources' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSidePanel(sidePanel === 'resources' ? null : 'resources')}
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
                <Button
                  variant={sidePanel === 'goals' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSidePanel(sidePanel === 'goals' ? null : 'goals')}
                >
                  <Target className="w-4 h-4" />
                </Button>
                <Button
                  variant={sidePanel === 'notes' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSidePanel(sidePanel === 'notes' ? null : 'notes')}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
              
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                    Text Channels
                  </div>
                  {selectedServer.channels?.map((channel) => (
                    <button
                      key={channel.channel_id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                        selectedChannel?.channel_id === channel.channel_id
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                      data-testid={`channel-${channel.channel_id}`}
                    >
                      <Hash className="w-4 h-4" />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-2 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-muted-foreground hover:text-destructive"
                  onClick={handleLeaveServer}
                  data-testid="leave-server-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Leave Server
                </Button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
              {selectedChannel ? (
                <>
                  {/* Channel Header */}
                  <div className="h-12 border-b border-border flex items-center px-4 gap-2">
                    <Hash className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{selectedChannel.name}</span>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <motion.div
                          key={message.message_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-3 group"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={message.user_avatar} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {message.user_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-medium">{message.user_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm mt-0.5 break-words">{message.content}</p>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <div className="flex-1 flex flex-col gap-1">
                        <Input
                          value={newMessage}
                          onChange={(e) => { setNewMessage(e.target.value); setMessageError(""); }}
                          placeholder={`Message #${selectedChannel.name}`}
                          className={messageError ? "border-destructive focus-visible:ring-destructive" : ""}
                          data-testid="message-input"
                        />
                        {messageError && (
                          <p className="text-xs text-destructive">{messageError}</p>
                        )}
                      </div>
                      <Button type="submit" size="icon" data-testid="send-message-btn">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">Select a channel to start chatting</p>
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="hidden xl:block w-60 bg-card border-l border-border p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-4">
                Members — {selectedServer.members?.length || 0}
              </h3>
              <div className="space-y-2">
                {selectedServer.members?.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {member.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate flex-1">{member.name}</span>
                    {selectedServer.owner_id === member.user_id && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Side Panel for Resources/Goals/Notes */}
            {sidePanel && (
              <div className="w-80 bg-card border-l border-border p-4 overflow-y-auto">
                {sidePanel === 'resources' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-medium flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" /> Shared Resources
                      </h3>
                      <Dialog open={resourceOpen} onOpenChange={setResourceOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Resource</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={resourceTitle}
                                onChange={(e) => { setResourceTitle(e.target.value); setResourceErrors((p) => ({ ...p, title: undefined })); }}
                                placeholder="Resource name"
                                className={resourceErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                              />
                              {resourceErrors.title && (
                                <p className="text-xs text-destructive">{resourceErrors.title}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>Type</Label>
                              <select
                                value={resourceType}
                                onChange={(e) => setResourceType(e.target.value)}
                                className="w-full p-2 rounded-md border border-input bg-background"
                              >
                                <option value="link">Link</option>
                                <option value="file">File</option>
                                <option value="note">Note</option>
                              </select>
                            </div>
                            {resourceType === 'link' && (
                              <div className="space-y-2">
                                <Label>URL</Label>
                                <Input
                                  value={resourceUrl}
                                  onChange={(e) => { setResourceUrl(e.target.value); setResourceErrors((p) => ({ ...p, url: undefined })); }}
                                  placeholder="https://..."
                                  className={resourceErrors.url ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                {resourceErrors.url && (
                                  <p className="text-xs text-destructive">{resourceErrors.url}</p>
                                )}
                              </div>
                            )}
                            {resourceType === 'note' && (
                              <div className="space-y-2">
                                <Label>Content</Label>
                                <Textarea
                                  value={resourceContent}
                                  onChange={(e) => { setResourceContent(e.target.value); setResourceErrors((p) => ({ ...p, content: undefined })); }}
                                  placeholder="Write your note..."
                                  className={resourceErrors.content ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                {resourceErrors.content && (
                                  <p className="text-xs text-destructive">{resourceErrors.content}</p>
                                )}
                              </div>
                            )}
                            <Button onClick={handleAddResource} className="w-full">
                              Add Resource
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2">
                      {resources.map((resource) => (
                        <div key={resource.resource_id} className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-start gap-2">
                            <LinkIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{resource.title}</p>
                              <p className="text-xs text-muted-foreground">{resource.user_name}</p>
                              {resource.url && (
                                <a 
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary flex items-center gap-1 mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {resources.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No resources shared yet
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {sidePanel === 'goals' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-medium flex items-center gap-2">
                        <Target className="w-4 h-4" /> Group Goals
                      </h3>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={handleGetAISuggestions}>
                          <Sparkles className="w-3 h-3" />
                        </Button>
                        <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Goal</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <Label>Goal Title</Label>
                                <Input
                                  value={goalTitle}
                                  onChange={(e) => { setGoalTitle(e.target.value); setGoalErrors((p) => ({ ...p, title: undefined })); }}
                                  placeholder="Study 100 hours together"
                                  className={goalErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                {goalErrors.title && (
                                  <p className="text-xs text-destructive">{goalErrors.title}</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={goalDescription}
                                  onChange={(e) => { setGoalDescription(e.target.value); setGoalErrors((p) => ({ ...p, description: undefined })); }}
                                  placeholder="What's this goal about?"
                                  className={goalErrors.description ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                {goalErrors.description && (
                                  <p className="text-xs text-destructive">{goalErrors.description}</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Target</Label>
                                <Input
                                  type="number"
                                  value={goalTarget}
                                  onChange={(e) => { setGoalTarget(e.target.value); setGoalErrors((p) => ({ ...p, target: undefined })); }}
                                  placeholder="100"
                                  className={goalErrors.target ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                {goalErrors.target && (
                                  <p className="text-xs text-destructive">{goalErrors.target}</p>
                                )}
                              </div>
                              <Button onClick={handleAddGoal} className="w-full">
                                Create Goal
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {goals.map((goal) => (
                        <div key={goal.goal_id} className="p-3 rounded-lg bg-secondary/50">
                          <p className="font-medium text-sm mb-1">{goal.title}</p>
                          {goal.description && (
                            <p className="text-xs text-muted-foreground mb-2">{goal.description}</p>
                          )}
                          <div className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>{goal.progress}</span>
                              <span>{goal.target}</span>
                            </div>
                            <Progress value={(goal.progress / goal.target) * 100} className="h-2" />
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            onClick={() => handleContributeGoal(goal.goal_id, 1)}
                          >
                            +1 Contribution
                          </Button>
                        </div>
                      ))}
                      {goals.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No goals yet. Create one!
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {sidePanel === 'notes' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Collaborative Notes
                      </h3>
                      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Note</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={noteTitle}
                                onChange={(e) => { setNoteTitle(e.target.value); setNoteErrors((p) => ({ ...p, title: undefined })); }}
                                placeholder="Meeting Notes"
                                className={noteErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                              />
                              {noteErrors.title && (
                                <p className="text-xs text-destructive">{noteErrors.title}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label>Content</Label>
                              <Textarea
                                value={noteContent}
                                onChange={(e) => { setNoteContent(e.target.value); setNoteErrors((p) => ({ ...p, content: undefined })); }}
                                placeholder="Start writing..."
                                rows={6}
                                className={noteErrors.content ? "border-destructive focus-visible:ring-destructive" : ""}
                              />
                              {noteErrors.content && (
                                <p className="text-xs text-destructive">{noteErrors.content}</p>
                              )}
                            </div>
                            <Button onClick={handleCreateNote} className="w-full">
                              Create Note
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {selectedNote ? (
                      <div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedNote(null)}
                          className="mb-2"
                        >
                          ← Back to list
                        </Button>
                        <div className="p-3 rounded-lg bg-secondary/50">
                          <p className="font-medium text-sm mb-2">{selectedNote.title}</p>
                          <Textarea
                            value={selectedNote.content}
                            onChange={(e) => setSelectedNote({...selectedNote, content: e.target.value})}
                            className="min-h-[200px] mb-2"
                          />
                          <Button size="sm" onClick={handleUpdateNote} className="w-full">
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {collaborativeNotes.map((note) => (
                          <div 
                            key={note.note_id} 
                            className="p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary"
                            onClick={() => setSelectedNote(note)}
                          >
                            <p className="font-medium text-sm">{note.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {note.content || "Empty note"}
                            </p>
                          </div>
                        ))}
                        {collaborativeNotes.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No notes yet. Create one!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-heading text-xl font-medium mb-2">No Server Selected</h2>
              <p className="text-muted-foreground mb-4">Create or join a server to get started</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setCreateServerOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Create Server
                </Button>
                <Button variant="outline" onClick={() => {
                  setDiscoverOpen(true);
                  fetchDiscoverServers();
                }}>
                  <Compass className="w-4 h-4 mr-2" /> Discover
                </Button>
              </div>
            </div>
          </div>
        )}
          </TabsContent>
          <TabsContent value="leaderboard" className="flex-1 mt-0 overflow-auto">
            <div className="p-6 text-muted-foreground">Leaderboard coming soon.</div>
          </TabsContent>
          <TabsContent value="shop" className="flex-1 mt-0 overflow-auto">
            <Shop embed />
          </TabsContent>
        </Tabs>
    </motion.div>
  );
}
