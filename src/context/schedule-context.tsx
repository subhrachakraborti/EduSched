
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Subject, Teacher, Classroom, TimeSlot, StudentGroup, ScheduleEntry, User } from '@/lib/types';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { supabase } from '@/lib/supabase';

interface ScheduleContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  removeSubject: (id: string) => void;
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  removeTeacher: (id: string) => void;
  classrooms: Classroom[];
  addClassroom: (classroom: Omit<Classroom, 'id'>) => void;
  removeClassroom: (id: string) => void;
  timeSlots: TimeSlot[];
  addTimeSlot: (timeSlot: Omit<TimeSlot, 'id'>) => void;
  removeTimeSlot: (id: string) => void;
  schedule: ScheduleEntry[];
  setSchedule: (schedule: ScheduleEntry[]) => void;
  updateScheduleEntry: (id: string, field: keyof ScheduleEntry, value: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', fbUser.uid)
            .single();

          if (error) throw error;
          
          if (data) {
            setUser(data as User);
          } else {
             setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user profile from Supabase:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (user: User) => {
    setUser(user);
  };

  const logout = () => {
    auth.signOut();
    setUser(null);
    setFirebaseUser(null);
  };

  const addSubject = (subject: Omit<Subject, 'id'>) => setSubjects(prev => [...prev, { ...subject, id: crypto.randomUUID() }]);
  const removeSubject = (id: string) => setSubjects(prev => prev.filter(c => c.id !== id));

  const addTeacher = (teacher: Omit<Teacher, 'id'>) => setTeachers(prev => [...prev, { ...teacher, id: crypto.randomUUID() }]);
  const removeTeacher = (id: string) => setTeachers(prev => prev.filter(t => t.id !== id));

  const addClassroom = (classroom: Omit<Classroom, 'id'>) => setClassrooms(prev => [...prev, { ...classroom, id: crypto.randomUUID() }]);
  const removeClassroom = (id: string) => setClassrooms(prev => prev.filter(c => c.id !== id));
  
  const addTimeSlot = (timeSlot: Omit<TimeSlot, 'id'>) => setTimeSlots(prev => [...prev, { ...timeSlot, id: crypto.randomUUID() }]);
  const removeTimeSlot = (id: string) => setTimeSlots(prev => prev.filter(ts => ts.id !== id));

  const updateScheduleEntry = (id: string, field: keyof ScheduleEntry, value: string) => {
    setSchedule(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };


  return (
    <ScheduleContext.Provider
      value={{
        user,
        firebaseUser,
        authLoading,
        login,
        logout,
        subjects,
        addSubject,
        removeSubject,
        teachers,
        addTeacher,
        removeTeacher,
        classrooms,
        addClassroom,
        removeClassroom,
        timeSlots,
        addTimeSlot,
        removeTimeSlot,
        schedule,
        setSchedule,
        updateScheduleEntry,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}

    