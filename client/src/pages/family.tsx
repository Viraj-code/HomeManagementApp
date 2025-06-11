import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, UserPlus, Settings, Camera, Baby, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const roleColors = {
  parent: "bg-red-100 text-red-800",
  cook: "bg-blue-100 text-blue-800", 
  child: "bg-green-100 text-green-800",
  admin: "bg-purple-100 text-purple-800"
};

export default function FamilyPage() {
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("parent");
  const [newMemberDob, setNewMemberDob] = useState("");
  const [newMemberAvatar, setNewMemberAvatar] = useState("");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const addMemberMutation = useMutation({
    mutationFn: async (memberData: { name: string; email: string; role: string; password: string }) => {
      return apiRequest("POST", "/api/auth/register", memberData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowAddMember(false);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("parent");
      setNewMemberDob("");
      setNewMemberAvatar("");
      toast({
        title: "Success",
        description: "Family member added successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add family member",
        variant: "destructive"
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (userData: { id: number; name?: string; avatar?: string; preferences?: any }) => {
      return apiRequest("PATCH", `/api/users/${userData.id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowEditProfile(false);
      setEditingUser(null);
      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  });

  const handleAddMember = () => {
    if (!newMemberName.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive"
      });
      return;
    }

    if (newMemberRole !== "child" && !newMemberEmail.trim()) {
      toast({
        title: "Error",
        description: "Email is required for non-child members",
        variant: "destructive"
      });
      return;
    }

    const memberData: any = {
      name: newMemberName,
      role: newMemberRole,
      avatar: newMemberAvatar || `https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`
    };

    if (newMemberRole === "child") {
      memberData.email = `child-${Date.now()}@family.local`; // Unique email for children
      memberData.password = "child123"; // Simple password for children
      memberData.dateOfBirth = newMemberDob;
      memberData.parentId = currentUser?.id;
    } else {
      memberData.email = newMemberEmail;
      memberData.password = "temppass123"; // Temporary password for adults
    }

    addMemberMutation.mutate(memberData);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Members</h1>
          <p className="text-gray-600 mt-1">Manage your family members and their roles.</p>
        </div>
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Family Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="cook">Cook</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newMemberRole !== "child" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                </div>
              )}

              {newMemberRole === "child" && (
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={newMemberDob}
                    onChange={(e) => setNewMemberDob(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="avatar">Profile Picture URL (Optional)</Label>
                <Input
                  id="avatar"
                  placeholder="https://example.com/photo.jpg"
                  value={newMemberAvatar}
                  onChange={(e) => setNewMemberAvatar(e.target.value)}
                />
                {newMemberAvatar && (
                  <div className="mt-2">
                    <img 
                      src={newMemberAvatar} 
                      alt="Preview" 
                      className="w-16 h-16 rounded-full object-cover"
                      onError={() => setNewMemberAvatar("")}
                    />
                  </div>
                )}
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddMember(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={addMemberMutation.isPending}
                  className="flex-1"
                >
                  {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users?.map((user: any) => (
          <Card key={user.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="relative">
                  <img 
                    src={user.avatar || "https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"} 
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                  {user.role === "child" && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                      <Baby className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  {user.role === "child" ? (
                    <div className="space-y-1">
                      {user.dateOfBirth && (
                        <p className="text-sm text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Born: {new Date(user.dateOfBirth).toLocaleDateString()}
                        </p>
                      )}
                      {user.parentId && (
                        <p className="text-xs text-gray-400">
                          Child of {users.find((p: any) => p.id === user.parentId)?.name || "Parent"}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-2">{user.email}</p>
                  )}
                  <Badge 
                    variant="outline" 
                    className={roleColors[user.role as keyof typeof roleColors] || roleColors.parent}
                  >
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditingUser(user);
                    setShowEditProfile(true);
                  }}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              
              {user.preferences && Object.keys(user.preferences).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Preferences</h4>
                  <div className="space-y-2">
                    {user.preferences.cuisines && user.preferences.cuisines.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Cuisines: </span>
                        <span className="text-xs text-gray-700">
                          {user.preferences.cuisines.join(", ")}
                        </span>
                      </div>
                    )}
                    {user.preferences.dietary && user.preferences.dietary.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500">Dietary: </span>
                        <span className="text-xs text-gray-700">
                          {user.preferences.dietary.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile - {editingUser?.name}</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  defaultValue={editingUser.name}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-avatar">Profile Picture URL</Label>
                <Input
                  id="edit-avatar"
                  defaultValue={editingUser.avatar || ""}
                  onChange={(e) => setEditingUser({...editingUser, avatar: e.target.value})}
                  placeholder="https://example.com/photo.jpg"
                />
                {editingUser.avatar && (
                  <div className="mt-2">
                    <img 
                      src={editingUser.avatar} 
                      alt="Preview" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cuisines">Favorite Cuisines (comma separated)</Label>
                <Input
                  id="edit-cuisines"
                  defaultValue={editingUser.preferences?.cuisines?.join(", ") || ""}
                  onChange={(e) => setEditingUser({
                    ...editingUser, 
                    preferences: {
                      ...editingUser.preferences,
                      cuisines: e.target.value.split(",").map((c: string) => c.trim()).filter(Boolean)
                    }
                  })}
                  placeholder="Italian, Mexican, Chinese"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dietary">Dietary Restrictions (comma separated)</Label>
                <Input
                  id="edit-dietary"
                  defaultValue={editingUser.preferences?.dietary?.join(", ") || ""}
                  onChange={(e) => setEditingUser({
                    ...editingUser, 
                    preferences: {
                      ...editingUser.preferences,
                      dietary: e.target.value.split(",").map((d: string) => d.trim()).filter(Boolean)
                    }
                  })}
                  placeholder="Vegetarian, Gluten-free, Nut allergy"
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateProfileMutation.mutate(editingUser)}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Family Stats */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Family Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{users?.length || 0}</div>
                <div className="text-sm text-gray-500">Total Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {users?.filter((u: any) => u.role === 'parent').length || 0}
                </div>
                <div className="text-sm text-gray-500">Parents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {users?.filter((u: any) => u.role === 'cook').length || 0}
                </div>
                <div className="text-sm text-gray-500">Cooks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {users?.filter((u: any) => u.role === 'child').length || 0}
                </div>
                <div className="text-sm text-gray-500">Children</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
