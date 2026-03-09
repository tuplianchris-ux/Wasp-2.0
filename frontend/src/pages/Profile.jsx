import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { AuthContext, API } from "../App";
import FounderBadge from "../components/FounderBadge";
import { toast } from "sonner";
import { profileSchema, formatZodErrors } from "../lib/validation";
import { 
  Camera, 
  Edit, 
  LayoutTemplate,
  CheckSquare,
  Crown,
  Star,
  Coins,
  Store,
  Trophy
} from "lucide-react";

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser, token, setUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profileErrors, setProfileErrors] = useState({});

  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);
  const isOwnProfile = !userId || userId === currentUser?.user_id;

  const fetchProfile = useCallback(async () => {
    try {
      if (isOwnProfile) {
        const response = await axios.get(`${API}/auth/me`, { headers, withCredentials: true });
        setProfile(response.data);
        setName(response.data.name || "");
        setBio(response.data.bio || "");
      } else {
        const response = await axios.get(`${API}/profile/${userId}`, { headers, withCredentials: true });
        setProfile(response.data);
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [headers, isOwnProfile, userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async () => {
    setProfileErrors({});
    const result = profileSchema.safeParse({ name, bio });
    if (!result.success) {
      setProfileErrors(formatZodErrors(result.error));
      return;
    }
    try {
      const response = await axios.put(`${API}/profile`, {
        name,
        bio
      }, { headers, withCredentials: true });
      
      setProfile(response.data);
      setUser(response.data);
      setEditOpen(false);
      toast.success("Profile updated!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/profile/avatar`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
        withCredentials: true
      });
      
      setProfile({ ...profile, avatar: response.data.avatar });
      setUser({ ...currentUser, avatar: response.data.avatar });
      toast.success("Avatar updated!");
    } catch (error) {
      toast.error("Failed to upload avatar");
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/profile/banner`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
        withCredentials: true
      });
      
      setProfile({ ...profile, banner: response.data.banner });
      setUser({ ...currentUser, banner: response.data.banner });
      toast.success("Banner updated!");
    } catch (error) {
      toast.error("Failed to upload banner");
    }
  };

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-xl"></div>
          <div className="h-32 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="profile-page">
        {/* Banner */}
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/10">
          {profile?.banner && (
            <img 
              src={profile.banner} 
              alt="Banner" 
              className="w-full h-full object-cover"
            />
          )}
          {isOwnProfile && (
            <label className="absolute bottom-4 right-4 cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors">
                <Camera className="w-4 h-4" />
                <span className="text-sm">Change Banner</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleBannerUpload}
                data-testid="banner-upload"
              />
            </label>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 -mt-16 relative z-10 pb-8">
          {/* Profile Card */}
          <Card className="border-border">
            <CardContent className="pt-0">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="relative -mt-12">
                  <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-background">
                    <AvatarImage src={profile?.avatar} alt={profile?.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl md:text-4xl">
                      {profile?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <label className="absolute bottom-0 right-0 cursor-pointer">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                        <Camera className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleAvatarUpload}
                        data-testid="avatar-upload"
                      />
                    </label>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 pt-4 md:pt-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <h1 className="font-heading text-2xl md:text-3xl font-semibold">
                          {profile?.name}
                        </h1>
                        {/* Founder badge takes priority; fall back to Premium */}
                        {profile?.founder_tier ? (
                          <FounderBadge user={profile} size="md" showLabel />
                        ) : profile?.is_premium ? (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                            <Crown className="w-3 h-3 mr-1" /> Premium
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">{profile?.email}</p>
                      {profile?.bio && (
                        <p className="mt-2 text-foreground">{profile.bio}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isOwnProfile && (
                        <Link to="/store">
                          <Button variant="outline" size="icon">
                            <Store className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                      {isOwnProfile && (
                        <Dialog open={editOpen} onOpenChange={setEditOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" data-testid="edit-profile-btn">
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Profile</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                  value={name}
                                  onChange={(e) => { setName(e.target.value); setProfileErrors((p) => ({ ...p, name: undefined })); }}
                                  data-testid="profile-name-input"
                                  className={profileErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                {profileErrors.name && (
                                  <p className="text-xs text-destructive">{profileErrors.name}</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Bio</Label>
                                <Textarea
                                  value={bio}
                                  onChange={(e) => { setBio(e.target.value); setProfileErrors((p) => ({ ...p, bio: undefined })); }}
                                  placeholder="Tell us about yourself..."
                                  data-testid="profile-bio-input"
                                  className={profileErrors.bio ? "border-destructive focus-visible:ring-destructive" : ""}
                                />
                                {profileErrors.bio && (
                                  <p className="text-xs text-destructive">{profileErrors.bio}</p>
                                )}
                              </div>
                              <Button onClick={handleUpdateProfile} className="w-full" data-testid="save-profile-btn">
                                Save Changes
                              </Button>
                            </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    </div>
                  </div>

                  {/* XP & Level Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="w-4 h-4 text-purple-500" />
                        <span className="text-xl font-bold">{profile?.level || 1}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Level</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Trophy className="w-4 h-4 text-blue-500" />
                        <span className="text-xl font-bold">{profile?.xp || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Total XP</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span className="text-xl font-bold">{profile?.coins || 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Coins</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary text-center">
                      <p className="text-xl font-bold">{profile?.templates?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Templates</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates Section */}
          {profile?.templates && profile.templates.length > 0 && (
            <div className="mt-8">
              <h2 className="font-heading text-xl font-medium mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5" /> Shared Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.templates.map((template) => (
                  <motion.div
                    key={template.task_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-border hover:shadow-soft transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <CheckSquare className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{template.title}</p>
                            {template.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {template.description}
                              </p>
                            )}
                            <Badge variant="secondary" className="mt-2">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty Templates */}
          {isOwnProfile && (!profile?.templates || profile.templates.length === 0) && (
            <Card className="mt-8 border-border border-dashed">
              <CardContent className="py-12 text-center">
                <LayoutTemplate className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No shared templates yet</h3>
                <p className="text-muted-foreground text-sm">
                  Create a task and check "Save as template" to share it with others
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
  );
}
