import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download } from "lucide-react";

interface InventoryGridProps {
  stats?: Array<{ bloodType: string; count: number; status: string }>;
  showActions?: boolean;
}

export default function InventoryGrid({ stats: propStats, showActions = false }: InventoryGridProps) {
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/stats/inventory'],
    enabled: !propStats,
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const displayStats = propStats || stats || [];

  const getStockLevel = (count: number) => {
    if (count < 20) return { level: "Critical", color: "text-red-600" };
    if (count < 50) return { level: "Low", color: "text-yellow-600" };
    return { level: "Good", color: "text-green-600" };
  };

  // Group stats by blood type and sum available counts
  const bloodTypeStats = displayStats.reduce((acc, item) => {
    if (!acc[item.bloodType]) {
      acc[item.bloodType] = { total: 0, available: 0 };
    }
    acc[item.bloodType].total += item.count;
    if (item.status === 'Available') {
      acc[item.bloodType].available += item.count;
    }
    return acc;
  }, {} as Record<string, { total: number; available: number }>);

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {showActions ? "Blood Bag Inventory" : "Blood Type Inventory"}
          </CardTitle>
          {showActions && (
            <div className="flex items-center space-x-2">
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New Bag
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {bloodTypes.map((bloodType) => {
            const typeStats = bloodTypeStats[bloodType] || { total: 0, available: 0 };
            const stockLevel = getStockLevel(typeStats.available);
            
            return (
              <div key={bloodType} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600 mb-2">{bloodType}</div>
                <div className="text-sm text-gray-600 mb-1">Available</div>
                <div className="text-xl font-semibold text-gray-900">{typeStats.available}</div>
                <div className={`text-xs mt-1 ${stockLevel.color}`}>
                  {stockLevel.level}
                </div>
                {showActions && (
                  <div className="text-xs text-gray-500 mt-1">
                    Total: {typeStats.total}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {displayStats.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No inventory data available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
