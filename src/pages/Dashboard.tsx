
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Welcome to PPT Genie Dashboard
            </CardTitle>
            <p className="text-gray-600">
              Logged in as: {user?.email}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              This is a protected dashboard page. Only authenticated users can access this.
            </p>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
