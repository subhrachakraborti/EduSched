
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSchedule } from '@/context/schedule-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap } from 'lucide-react';
import users from '@/lib/users.json';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useSchedule();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const user = users.find((u) => u.id === userId);

      if (user) {
        login(user);
        toast({
          title: `Welcome, ${user.name}!`,
          description: `Logged in as ${user.type}.`,
        });
        router.push('/');
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Invalid User ID. Please try again.',
        });
        setIsLoading(false);
      }
    }, 500); // Simulate network delay
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <GraduationCap className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">EduSched Login</CardTitle>
          <CardDescription>Enter your User ID to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              placeholder="User ID (e.g., student001, admin001)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={isLoading || !userId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
