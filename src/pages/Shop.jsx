import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { AuthContext, API } from "../App";
import { toast } from "sonner";
import { 
  ShoppingBag, 
  Gift, 
  Heart,
  Plus, 
  ExternalLink,
  Coins,
  Sparkles,
  Zap,
  Palette,
  BookTemplate,
  Lock,
  Users
} from "lucide-react";

export default function Shop({ embed = false }) {
  const { user, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("store");
  const [storeItems, setStoreItems] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Wishlist form
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistName, setWishlistName] = useState("");
  const [wishlistDesc, setWishlistDesc] = useState("");
  
  // Item form
  const [itemOpen, setItemOpen] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemUrl, setItemUrl] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  
  // Exchange form
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [exchangeName, setExchangeName] = useState("");
  const [exchangeDesc, setExchangeDesc] = useState("");
  const [exchangeBudget, setExchangeBudget] = useState("");

  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const fetchAll = useCallback(async () => {
    try {
      const [storeRes, wishlistRes, exchangeRes] = await Promise.all([
        axios.get(`${API}/store/items`, { headers, withCredentials: true }),
        axios.get(`${API}/wishlists`, { headers, withCredentials: true }),
        axios.get(`${API}/exchanges`, { headers, withCredentials: true })
      ]);
      setStoreItems(storeRes.data);
      setWishlists(wishlistRes.data);
      setExchanges(exchangeRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreateWishlist = async () => {
    if (!wishlistName.trim()) return;
    try {
      const response = await axios.post(`${API}/wishlists`, {
        name: wishlistName,
        description: wishlistDesc
      }, { headers, withCredentials: true });
      setWishlists([response.data, ...wishlists]);
      setWishlistName("");
      setWishlistDesc("");
      setWishlistOpen(false);
      toast.success("Wishlist created!");
    } catch (error) {
      toast.error("Failed to create wishlist");
    }
  };

  const handleAddItem = async () => {
    if (!itemTitle.trim() || !selectedWishlist) return;
    try {
      await axios.post(`${API}/wishlists/items`, {
        wishlist_id: selectedWishlist,
        title: itemTitle,
        url: itemUrl || null,
        price: itemPrice ? parseFloat(itemPrice) : null,
        notes: itemNotes || null
      }, { headers, withCredentials: true });
      
      // Refresh wishlists
      const response = await axios.get(`${API}/wishlists`, { headers, withCredentials: true });
      setWishlists(response.data);
      
      setItemTitle("");
      setItemUrl("");
      setItemPrice("");
      setItemNotes("");
      setItemOpen(false);
      toast.success("Item added!");
    } catch (error) {
      toast.error("Failed to add item");
    }
  };

  const handleCreateExchange = async () => {
    if (!exchangeName.trim()) return;
    try {
      const response = await axios.post(`${API}/exchanges`, {
        name: exchangeName,
        description: exchangeDesc,
        budget: exchangeBudget ? parseFloat(exchangeBudget) : null
      }, { headers, withCredentials: true });
      setExchanges([response.data, ...exchanges]);
      setExchangeName("");
      setExchangeDesc("");
      setExchangeBudget("");
      setExchangeOpen(false);
      toast.success("Exchange created!");
    } catch (error) {
      toast.error("Failed to create exchange");
    }
  };

  const handleJoinExchange = async (exchangeId) => {
    try {
      await axios.post(`${API}/exchanges/${exchangeId}/join`, {}, { headers, withCredentials: true });
      toast.success("Joined exchange!");
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to join");
    }
  };

  const categoryInfo = {
    avatar_cosmetics: { icon: <Palette className="w-5 h-5" />, label: "Cosmetics", color: "from-pink-500 to-rose-500" },
    xp_boosters: { icon: <Zap className="w-5 h-5" />, label: "XP Boosters", color: "from-yellow-500 to-orange-500" },
    study_aids: { icon: <BookTemplate className="w-5 h-5" />, label: "Study Aids", color: "from-blue-500 to-cyan-500" },
    template_packs: { icon: <Sparkles className="w-5 h-5" />, label: "Templates", color: "from-purple-500 to-violet-500" }
  };

  if (loading) {
    const loadingContent = (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
    if (embed) return loadingContent;
    return loadingContent;
  }

  const shopMain = (
    <div className="flex-1 p-4 md:p-8 overflow-auto" data-testid="shop-page">
        {/* Hero Header */}
        <div className="relative mb-8 p-6 md:p-8 rounded-2xl overflow-hidden bg-gradient-to-br from-pink-600 via-purple-500 to-indigo-500">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">Shop & Gifts</h1>
                  <p className="text-white/80 text-sm md:text-base">Store, wishlists & gift exchanges</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                <Coins className="w-5 h-5 text-amber-300" />
                <span className="text-white font-bold">{user?.coins || 0}</span>
                <span className="text-white/70 text-sm">coins</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="store" data-testid="tab-store">
              <ShoppingBag className="w-4 h-4 mr-2" /> Store
            </TabsTrigger>
            <TabsTrigger value="wishlists" data-testid="tab-wishlists">
              <Heart className="w-4 h-4 mr-2" /> Wishlists
            </TabsTrigger>
            <TabsTrigger value="exchanges" data-testid="tab-exchanges">
              <Gift className="w-4 h-4 mr-2" /> Exchanges
            </TabsTrigger>
          </TabsList>

          {/* Store Tab */}
          <TabsContent value="store">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {storeItems.map((item, index) => {
                const catInfo = categoryInfo[item.category] || categoryInfo.avatar_cosmetics;
                return (
                  <motion.div
                    key={item.item_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-border h-full relative overflow-hidden group">
                      {item.coming_soon && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                          <Badge variant="secondary" className="text-sm">
                            <Lock className="w-4 h-4 mr-1" /> Coming Soon
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className={`w-full h-24 rounded-lg bg-gradient-to-br ${catInfo.color} flex items-center justify-center mb-3`}>
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white">
                            {catInfo.icon}
                          </div>
                        </div>
                        <h3 className="font-medium mb-1">{item.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Coins className="w-4 h-4" />
                            <span className="font-bold">{item.price}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{catInfo.label}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* Wishlists Tab */}
          <TabsContent value="wishlists">
            <div className="flex justify-end mb-4">
              <Dialog open={wishlistOpen} onOpenChange={setWishlistOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="create-wishlist-btn">
                    <Plus className="w-4 h-4 mr-2" /> New Wishlist
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Wishlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={wishlistName} onChange={(e) => setWishlistName(e.target.value)} placeholder="My Birthday Wishlist" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea value={wishlistDesc} onChange={(e) => setWishlistDesc(e.target.value)} placeholder="Things I'd love to receive..." />
                    </div>
                    <Button onClick={handleCreateWishlist} className="w-full">Create Wishlist</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlists.map((wishlist) => (
                <Card key={wishlist.wishlist_id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" />
                        {wishlist.name}
                      </CardTitle>
                      <Badge variant="secondary">{wishlist.items?.length || 0} items</Badge>
                    </div>
                    {wishlist.description && (
                      <CardDescription>{wishlist.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {wishlist.items?.slice(0, 3).map((item) => (
                        <div key={item.item_id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                          <span className="text-sm truncate flex-1">{item.title}</span>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {item.price && (
                            <span className="text-sm text-muted-foreground ml-2">${item.price}</span>
                          )}
                        </div>
                      ))}
                      {(wishlist.items?.length || 0) > 3 && (
                        <p className="text-xs text-muted-foreground text-center">+{wishlist.items.length - 3} more items</p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => { setSelectedWishlist(wishlist.wishlist_id); setItemOpen(true); }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Item
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {wishlists.length === 0 && (
                <Card className="border-border border-dashed col-span-full">
                  <CardContent className="py-12 text-center">
                    <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No wishlists yet</p>
                    <Button onClick={() => setWishlistOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Create your first wishlist
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Add Item Dialog */}
            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Item to Wishlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="What do you want?" />
                  </div>
                  <div className="space-y-2">
                    <Label>URL (optional)</Label>
                    <Input value={itemUrl} onChange={(e) => setItemUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (optional)</Label>
                    <Input type="number" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="29.99" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} placeholder="Size, color, etc." />
                  </div>
                  <Button onClick={handleAddItem} className="w-full">Add Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Exchanges Tab */}
          <TabsContent value="exchanges">
            <div className="flex justify-end mb-4">
              <Dialog open={exchangeOpen} onOpenChange={setExchangeOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="create-exchange-btn">
                    <Plus className="w-4 h-4 mr-2" /> New Exchange
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Gift Exchange</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={exchangeName} onChange={(e) => setExchangeName(e.target.value)} placeholder="Secret Santa 2024" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea value={exchangeDesc} onChange={(e) => setExchangeDesc(e.target.value)} placeholder="Annual gift exchange..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Budget (optional)</Label>
                      <Input type="number" value={exchangeBudget} onChange={(e) => setExchangeBudget(e.target.value)} placeholder="25" />
                    </div>
                    <Button onClick={handleCreateExchange} className="w-full">Create Exchange</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exchanges.map((exchange) => (
                <Card key={exchange.exchange_id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Gift className="w-5 h-5 text-green-500" />
                        {exchange.name}
                      </CardTitle>
                    </div>
                    {exchange.description && (
                      <CardDescription>{exchange.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> {exchange.participant_count || 0} joined
                      </span>
                      {exchange.budget && (
                        <span>Budget: ${exchange.budget}</span>
                      )}
                    </div>
                    <Button onClick={() => handleJoinExchange(exchange.exchange_id)} className="w-full">
                      Join Exchange
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {exchanges.length === 0 && (
                <Card className="border-border border-dashed col-span-full">
                  <CardContent className="py-12 text-center">
                    <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No gift exchanges yet</p>
                    <Button onClick={() => setExchangeOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Create a gift exchange
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );

  return shopMain;
}
