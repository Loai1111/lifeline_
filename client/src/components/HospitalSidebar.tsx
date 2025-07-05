import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart3, Plus, List, Package } from "lucide-react";

export default function HospitalSidebar() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { path: "/hospital", label: "Dashboard", icon: BarChart3 },
    { path: "/hospital/request", label: "New Request", icon: Plus },
    { path: "/hospital/requests", label: "My Requests", icon: List },
    { path: "/hospital/inventory", label: "Available Stock", icon: Package },
  ];

  return (
    <nav className="p-4">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path === "/hospital" && location === "/");
          
          return (
            <li key={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start ${
                  isActive 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-50' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setLocation(item.path)}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
