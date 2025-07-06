import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertBloodBagSchema } from "@shared/schema";

// Form schema based on blood bag schema
const bloodBagFormSchema = z.object({
  donorId: z.string().min(1, "Donor ID is required"),
  bloodType: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  volume: z.number().min(1, "Volume must be greater than 0"),
  collectionDate: z.string().min(1, "Collection date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  status: z.enum(["Pending Testing", "Available", "Reserved", "Crossmatched", "Issued", "Used", "Discarded"]),
});

type BloodBagFormData = z.infer<typeof bloodBagFormSchema>;

export default function BloodBagForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BloodBagFormData>({
    resolver: zodResolver(bloodBagFormSchema),
    defaultValues: {
      donorId: "",
      bloodType: "A+",
      volume: 450,
      collectionDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 35 days from now
      status: "Pending Testing",
    },
  });

  const createBloodBagMutation = useMutation({
    mutationFn: async (data: BloodBagFormData) => {
      const formattedData = {
        ...data,
        collectionDate: new Date(data.collectionDate),
        expiryDate: new Date(data.expiryDate),
      };
      return await apiRequest("POST", "/api/blood-bags", formattedData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Blood bag created successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/blood-bags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/inventory'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create blood bag",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BloodBagFormData) => {
    createBloodBagMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Add New Blood Bag</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="donorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donor ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter donor ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bloodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume (ml)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="450" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="collectionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending Testing">Pending Testing</SelectItem>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Reserved">Reserved</SelectItem>
                        <SelectItem value="Crossmatched">Crossmatched</SelectItem>
                        <SelectItem value="Issued">Issued</SelectItem>
                        <SelectItem value="Used">Used</SelectItem>
                        <SelectItem value="Discarded">Discarded</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createBloodBagMutation.isPending}
            >
              {createBloodBagMutation.isPending ? "Creating..." : "Create Blood Bag"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
