
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSchedule } from '@/context/schedule-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { supabase } from '@/lib/supabase';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { User } from '@/lib/types';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useSchedule();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!name) {
            toast({ variant: 'destructive', title: 'Sign Up Failed', description: 'Please provide your name.' });
            setIsLoading(false);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        const newUser: Omit<User, 'id' | 'dob' | 'subjects' | 'group'> = { name, type: userType };

        const { error } = await supabase.from('users').insert({ id: firebaseUser.uid, ...newUser });

        if (error) throw error;
        
        login({ id: firebaseUser.uid, ...newUser, dob: '', subjects: [], group: '' });
        toast({ title: 'Account Created!', description: 'Welcome to EduSched.' });

      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const { data, error } = await supabase.from('users').select('*').eq('id', firebaseUser.uid).single();

        if (error || !data) throw error || new Error("User not found in database.");

        login(data as User);
        toast({ title: `Welcome back, ${data.name}!` });
      }
      router.push('/');
    } catch (error: any) {
        const errorMessage = error.message || 'An unexpected error occurred.';
        toast({
            variant: 'destructive',
            title: `${mode === 'login' ? 'Login' : 'Sign Up'} Failed`,
            description: errorMessage,
        });
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <GraduationCap className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">{mode === 'login' ? 'EduSched Login' : 'Create Account'}</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Enter your credentials to access your dashboard' : 'Fill out the form to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="me@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
             {mode === 'signup' && (
                <div className="space-y-2">
                    <Label>I am a...</Label>
                    <RadioGroup value={userType} onValueChange={(v) => setUserType(v as any)} className="flex gap-4 pt-1">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="student" id="r-student" />
                            <Label htmlFor="r-student">Student</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="teacher" id="r-teacher" />
                            <Label htmlFor="r-teacher">Teacher</Label>
                        </div>
                    </RadioGroup>
                </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </Button>
          </form>
           <div className="mt-4 text-center text-sm">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <Button variant="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign Up' : 'Login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
