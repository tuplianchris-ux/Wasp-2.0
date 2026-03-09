import { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AuthContext, API } from "../App";
import Sidebar from "../components/Sidebar";
import { toast } from "sonner";
import { 
  Store as StoreIcon, 
  Crown, 
  Sparkles,
  Coins,
  Star,
  Zap,
  BookOpen,
  FileText,
  Frame,
  Lock,
  ShoppingBag
} from "lucide-react";

export default function Store() {
  const { user, token } = useContext(AuthContext);
  const [storeItems, setStoreItems] = useState([]);
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, premiumRes] = await Promise.all([
        axios.get(`${API}/store/items`, { headers, withCredentials: true }),
        axios.get(`${API}/premium/status`, { headers, withCredentials: true })
      ]);
      setStoreItems(itemsRes.data);
      setPremiumStatus(premiumRes.data);
    } catch (error) {
      toast.error("Failed to load store");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribePremium = async () => {
    try {
      await axios.post(`${API}/premium/subscribe`, {}, { headers, withCredentials: true });
      toast.success("Premium activated! You received 500 XP and 500 coins!");
      fetchData();
    } catch (error) {
      toast.error("Failed to subscribe");
    }
  };

  const categoryInfo = {
    avatar_cosmetics: { icon: <Frame className="w-5 h-5" />, label: "Avatar Cosmetics", color: "from-pink-500 to-rose-500" },
    xp_boosters: { icon: <Zap className="w-5 h-5" />, label: "XP Boosters", color: "from-yellow-500 to-orange-500" },
    study_aids: { icon: <BookOpen className="w-5 h-5" />, label: "Study Aids", color: "from-blue-500 to-cyan-500" },
    template_packs: { icon: <FileText className="w-5 h-5" />, label: "Template Packs", color: "from-purple-500 to-violet-500" }
  };

  const categories = [...new Set(storeItems.map(item => item.category))];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded-xl"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto" data-testid="store-page">
        {/* Hero Header */}
        <div className="relative mb-8 p-6 md:p-8 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <StoreIcon className="w-8 h-8 text-white" />
                  <h1 className="font-heading text-3xl md:text-4xl font-bold text-white">Store</h1>
                </div>
                <p className="text-white/80 max-w-lg">
                  Spend your coins on cosmetics, boosters, and study aids. More items coming soon!
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                <Coins className="w-6 h-6 text-yellow-300" />
                <span className="text-2xl font-bold text-white">{user?.coins || 0}</span>
                <span className="text-white/70">coins</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Premium Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="font-heading text-2xl font-bold">TaskFlow Premium</h2>
                    {premiumStatus?.is_premium && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        Active
                      </Badge>
                    )}
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                    {premiumStatus?.benefits?.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-center">
                  {premiumStatus?.is_premium ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Active until</p>
                      <p className="font-medium">{new Date(premiumStatus.premium_until).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      onClick={handleSubscribePremium}
                      data-testid="subscribe-premium-btn"
                    >
                      <Crown className="w-5 h-5 mr-2" /> Get Premium
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Store Items */}
        <Tabs defaultValue={categories[0]} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((cat) => {
              const info = categoryInfo[cat];
              return (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className={`data-[state=active]:bg-gradient-to-r data-[state=active]:${info?.color} data-[state=active]:text-white px-4 py-2 rounded-lg`}
                >
                  {info?.icon}
                  <span className="ml-2">{info?.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((cat) => {
            const catItems = storeItems.filter(item => item.category === cat);
            const info = categoryInfo[cat];
            
            return (
              <TabsContent key={cat} value={cat}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catItems.map((item, index) => (
                    <motion.div
                      key={item.item_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-border hover:shadow-medium transition-all relative overflow-hidden">
                        {item.coming_soon && (
                          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="text-center">
                              <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                              <Badge variant="secondary">Coming Soon</Badge>
                            </div>
                          </div>
                        )}
                        <CardContent className="p-6">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${info?.color} flex items-center justify-center text-white mb-4`}>
                            {info?.icon}
                          </div>
                          <h3 className="font-medium mb-1">{item.name}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-amber-500">
                              <Coins className="w-4 h-4" />
                              <span className="font-bold">{item.price}</span>
                            </div>
                            <Button size="sm" disabled={item.coming_soon}>
                              <ShoppingBag className="w-4 h-4 mr-1" /> Buy
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
}
