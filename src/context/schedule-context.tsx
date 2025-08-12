
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Course, Teacher, Classroom, TimeSlot, StudentGroup, ScheduleEntry, User } from '@/lib/types';

interface ScheduleContextType {
  user: User | null;
  authLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  courses: Course[];
  addCourse: (course: Omit<Course, 'id'>) => void;
  removeCourse: (id: string) => void;
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  removeTeacher: (id: string) => void;
  classrooms: Classroom[];
  addClassroom: (classroom: Omit<Classroom, 'id'>) => void;
  removeClassroom: (id: string) => void;
  timeSlots: TimeSlot[];
  addTimeSlot: (timeSlot: Omit<TimeSlot, 'id'>) => void;
  removeTimeSlot: (id: string) => void;
  studentGroups: StudentGroup[];
  addStudentGroup: (group: Omit<StudentGroup, 'id'>) => void;
  removeStudentGroup: (id: string) => void;
  schedule: ScheduleEntry[];
  setSchedule: (schedule: ScheduleEntry[]) => void;
  updateScheduleEntry: (id: string, field: keyof ScheduleEntry, value: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const login = (user: User) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const addCourse = (course: Omit<Course, 'id'>) => setCourses(prev => [...prev, { ...course, id: crypto.randomUUID() }]);
  const removeCourse = (id: string) => setCourses(prev => prev.filter(c => c.id !== id));

  const addTeacher = (teacher: Omit<Teacher, 'id'>) => setTeachers(prev => [...prev, { ...teacher, id: crypto.randomUUID() }]);
  const removeTeacher = (id: string) => setTeachers(prev => prev.filter(t => t.id !== id));

  const addClassroom = (classroom: Omit<Classroom, 'id'>) => setClassrooms(prev => [...prev, { ...classroom, id: crypto.randomUUID() }]);
  const removeClassroom = (id: string) => setClassrooms(prev => prev.filter(c => c.id !== id));
  
  const addTimeSlot = (timeSlot: Omit<TimeSlot, 'id'>) => setTimeSlots(prev => [...prev, { ...timeSlot, id: crypto.randomUUID() }]);
  const removeTimeSlot = (id: string) => setTimeSlots(prev => prev.filter(ts => ts.id !== id));

  const addStudentGroup = (group: Omit<StudentGroup, 'id'>) => setStudentGroups(prev => [...prev, { ...group, id: crypto.randomUUID() }]);
  const removeStudentGroup = (id: string) => setStudentGroups(prev => prev.filter(sg => sg.id !== id));

  const updateScheduleEntry = (id: string, field: keyof ScheduleEntry, value: string) => {
    setSchedule(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };


  return (
    <ScheduleContext.Provider
      value={{
        user,
        authLoading,
        login,
        logout,
        courses,
        addCourse,
        removeCourse,
        teachers,
        addTeacher,
        removeTeacher,
        classrooms,
        addClassroom,
        removeClassroom,
        timeSlots,
        addTimeSlot,
        removeTimeSlot,
        studentGroups,
        addStudentGroup,
        removeStudentGroup,
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
