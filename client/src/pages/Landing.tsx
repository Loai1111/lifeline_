import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Shield, Users, Activity } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-red-600">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-6">
            <Heart className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Lifeline</h1>
          <p className="text-xl text-blue-100 mb-8">
            Healthcare Professional Portal
          </p>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            A comprehensive web portal for hospitals and blood banks to manage 
            blood requests, inventory, and coordination efficiently.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              onClick={() => window.location.href = '/api/login'}
            >
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="border-0 shadow-xl bg-white/10 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                For Hospitals
              </h3>
              <p className="text-blue-100">
                Submit blood requests, track status, and manage patient needs efficiently
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/10 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                For Blood Banks
              </h3>
              <p className="text-blue-100">
                Manage inventory, process requests, and coordinate with hospitals
              </p>
            </CardContent>
          </Card>


        </div>

        <div className="mt-16 text-center">
          <p className="text-blue-100 text-sm">
            Secure • Reliable • Life-saving
          </p>
        </div>
      </div>
    </div>
  );
}
