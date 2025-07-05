import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Inbox, Package, Users, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function BloodBankSidebar() {
  const [location, setLocation] = useLocation();

  const { data: requestStats } = useQuery({
    queryKey: ['/api/stats/requests'],
    retry: false,
  });

  const navItems = [
    { path: "/blood-bank", label: "Dashboard", icon: BarChart3 },
    { 
      path: "/blood-bank/requests", 
      label: "Incoming Requests", 
      icon: Inbox,
      badge: requestStats?.pending || 0
    },
    { path: "/blood-bank/inventory", label: "Blood Inventory", icon: Package },
    { path: "/blood-bank/donors", label: "Donors", icon: Users },
    { path: "/blood-bank/screening", label: "Health Screening", icon: UserCheck },
  ];

  return (
    <nav className="p-4">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path === "/blood-bank" && location === "/");
          
          return (
            <li key={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start ${
                  isActive 
                    ? 'text-red-600 bg-red-50 hover:bg-red-50' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setLocation(item.path)}
              >
                <Icon className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
