import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Utensils, 
  ShoppingCart, 
  Calendar, 
  Users, 
  LogOut 
} from "lucide-react";

const getAllNavigationItems = () => [
  { path: "/", icon: Home, label: "Dashboard", roles: ["parent", "cook", "child"] },
  { path: "/meal-planning", icon: Utensils, label: "Meal Planning", roles: ["parent", "cook"] },
  { path: "/shopping-lists", icon: ShoppingCart, label: "Shopping Lists", roles: ["parent", "cook", "child"] },
  { path: "/activities", icon: Calendar, label: "Activities", roles: ["parent", "child"] },
  { path: "/family", icon: Users, label: "Family", roles: ["parent"] },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
  };

  // Filter navigation items based on user role
  const navigationItems = getAllNavigationItems().filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="bg-white w-64 shadow-lg flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
            <Home className="text-white w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">FamilyHub</h1>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center space-x-3">
          <img 
            src={user.avatar || "https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
        </div>
        <Button 
          onClick={handleLogout}
          variant="outline" 
          size="sm" 
          className="w-full flex items-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
