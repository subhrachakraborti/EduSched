
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSchedule } from '@/context/schedule-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, School, Users, Clock, Loader2, FileWarning, UserPlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateTimetableAction, createUserAction, fetchTeachersAction, saveScheduleAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const timeSlotSchema = z.object({ 
    day: z.string().min(1, "Day is required"),
    from: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
    to: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
});

type TimeSlotFormData = z.infer<typeof timeSlotSchema>;

const userSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format." }),
  type: z.enum(["student", "teacher"]),
  subjects: z.array(z.string()).min(1, { message: "At least one subject must be selected." }),
  group: z.string().optional(),
}).refine(data => {
    if (data.type === 'student' && !data.group) {
        return false;
    }
    return true;
}, {
    message: "Student group is required.",
    path: ["group"],
});

type UserFormData = z.infer<typeof userSchema>;

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const predefinedClassrooms = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2"];

function SubjectsSection({ subjects }: { subjects: string[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Available Subjects</CardTitle>
                <CardDescription>These are the subjects assigned to you. The timetable will be generated based on this list.</CardDescription>
            </CardHeader>
            <CardContent>
                {subjects && subjects.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 rounded-md border p-4 md:grid-cols-3 lg:grid-cols-4">
                        {subjects.map(s => <div key={s} className="rounded-md bg-muted px-3 py-1 text-sm font-medium">{s}</div>)}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">You are not assigned to any subjects.</p>
                )}
            </CardContent>
        </Card>
    );
}

function TeachersSection({ availableTeachers, selectedTeachers, onTeacherSelectionChange, isLoading }: { availableTeachers: User[], selectedTeachers: string[], onTeacherSelectionChange: (id: string, isSelected: boolean) => void, isLoading: boolean }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Available Teachers</CardTitle>
                <CardDescription>Select the teachers who are available for this schedule.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                ) : availableTeachers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-4 md:grid-cols-3 lg:grid-cols-4">
                        {availableTeachers.map((teacher) => (
                             <div key={teacher.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={`teacher-${teacher.id}`}
                                    checked={selectedTeachers.includes(teacher.id)}
                                    onCheckedChange={(checked) => onTeacherSelectionChange(teacher.id, !!checked)}
                                />
                                <Label htmlFor={`teacher-${teacher.id}`} className="font-normal">{teacher.name}</Label>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No teachers found in the system.</p>
                )}
            </CardContent>
        </Card>
    );
}

function ClassroomsSection({ selectedClassrooms, onClassroomSelectionChange }: { selectedClassrooms: string[], onClassroomSelectionChange: (name: string, isSelected: boolean) => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Available Classrooms</CardTitle>
                <CardDescription>Select the classrooms that are available for this schedule.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-4 md:grid-cols-3 lg:grid-cols-4">
                    {predefinedClassrooms.map((room) => (
                        <div key={room} className="flex items-center gap-2">
                            <Checkbox
                                id={`classroom-${room}`}
                                checked={selectedClassrooms.includes(room)}
                                onCheckedChange={(checked) => onClassroomSelectionChange(room, !!checked)}
                            />
                            <Label htmlFor={`classroom-${room}`} className="font-normal">{room}</Label>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function TimeSlotsSection() {
    const { timeSlots, addTimeSlot, removeTimeSlot } = useSchedule();
    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TimeSlotFormData>({ resolver: zodResolver(timeSlotSchema) });
    const onSubmit: SubmitHandler<TimeSlotFormData> = (data) => { addTimeSlot(data); reset(); };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Time Slots</CardTitle>
                <CardDescription>Define the time slots for classes throughout the week.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="mb-4 space-y-2">
                    <Controller
                        name="day"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Select a day" /></SelectTrigger>
                                <SelectContent>
                                    {daysOfWeek.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    <div className="flex gap-2">
                        <Input {...register("from")} type="time" />
                        <Input {...register("to")} type="time" />
                    </div>
                    <Button type="submit" className="w-full">Add Time Slot</Button>
                </form>
                 {errors.day && <p className="text-sm text-destructive">{errors.day.message}</p>}
                 {(errors.from || errors.to) && <p className="text-sm text-destructive">Please enter valid start and end times (HH:mm).</p>}
                
                <div className="max-h-60 overflow-y-auto rounded-md border">
                    <ul className="divide-y">
                        {timeSlots.length > 0 ? timeSlots.map(ts => (
                            <li key={ts.id} className="flex items-center justify-between p-2 text-sm">
                                <span>{ts.day}: {ts.from} - {ts.to}</span>
                                <Button variant="ghost" size="icon" onClick={() => removeTimeSlot(ts.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </li>
                        )) : (
                            <li className="p-4 text-center text-muted-foreground">No time slots added.</li>
                        )}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}

function UserManagementSection({ adminSubjects }: { adminSubjects: string[] }) {
    const { toast } = useToast();
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const {
        register,
        handleSubmit,
        watch,
        control,
        reset,
        formState: { errors },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: { type: "student", subjects: [] }
    });
    
    const userType = watch("type");

    const onUserSubmit: SubmitHandler<UserFormData> = async (data) => {
        setIsCreatingUser(true);
        const result = await createUserAction(data);
        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'User Creation Failed',
                description: result.error,
            });
        } else {
            toast({
                title: 'User Created Successfully!',
                description: `User ${result.user?.name} has been created.`,
            });
            reset();
        }
        setIsCreatingUser(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  <CardTitle>User Management</CardTitle>
                </div>
                <CardDescription>Create new student or teacher accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onUserSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" {...register("email")} />
                             {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" {...register("password")} />
                             {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="name">Full Name</Label>
                            <Input id="name" {...register("name")} />
                             {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="dob">Date of Birth</Label>
                            <Input id="dob" type="date" {...register("dob")} />
                             {errors.dob && <p className="text-sm text-destructive">{errors.dob.message}</p>}
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>User Type</Label>
                         <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex items-center gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="student" id="student" />
                                        <Label htmlFor="student">Student</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="teacher" id="teacher" />
                                        <Label htmlFor="teacher">Teacher</Label>
                                    </div>
                                </RadioGroup>
                            )}
                        />
                    </div>
                    
                    <div className="space-y-3">
                        <Label>Subjects</Label>
                        <Controller
                            name="subjects"
                            control={control}
                            render={({ field }) => (
                                <div className="grid grid-cols-2 gap-2 rounded-md border p-4 md:grid-cols-3">
                                    {(adminSubjects || []).map((subject) => (
                                        <div key={subject} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`subject-${subject}`}
                                                checked={field.value?.includes(subject)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...(field.value || []), subject])
                                                        : field.onChange(field.value?.filter((value) => value !== subject));
                                                }}
                                            />
                                            <Label htmlFor={`subject-${subject}`} className="font-normal">{subject}</Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        />
                        {errors.subjects && <p className="text-sm text-destructive">{errors.subjects.message}</p>}
                    </div>

                    {userType === 'student' && (
                        <div className="space-y-2">
                            <Label htmlFor="group">Student Group</Label>
                            <Input id="group" {...register("group")} placeholder="e.g., Group A" />
                            {errors.group && <p className="text-sm text-destructive">{errors.group.message}</p>}
                        </div>
                    )}

                    <Button type="submit" disabled={isCreatingUser}>
                        {isCreatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create User
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function DataManagementPage() {
  const { 
    user,
    timeSlots,
    setIsLoading, setSchedule, isLoading
  } = useSchedule();
  
  const { toast } = useToast();
  const router = useRouter();

  const [availableTeachers, setAvailableTeachers] = useState<User[]>([]);
  const [isTeachersLoading, setIsTeachersLoading] = useState(true);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>([]);

  useEffect(() => {
      const loadTeachers = async () => {
          setIsTeachersLoading(true);
          const result = await fetchTeachersAction();
          if (result.error) {
              toast({ variant: 'destructive', title: 'Failed to load teachers', description: result.error });
          } else {
              setAvailableTeachers(result.data || []);
          }
          setIsTeachersLoading(false);
      };
      if(user?.type === 'admin') {
        loadTeachers();
      }
  }, [user, toast]);

  if (user?.type !== 'admin') {
    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-card-foreground/5 p-8 text-center">
            <FileWarning className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                You do not have permission to view this page.
            </p>
        </div>
    );
  }

  const handleTeacherSelection = (id: string, isSelected: boolean) => {
      setSelectedTeachers(prev => isSelected ? [...prev, id] : prev.filter(tId => tId !== id));
  }

  const handleClassroomSelection = (name: string, isSelected: boolean) => {
      setSelectedClassrooms(prev => isSelected ? [...prev, name] : prev.filter(cName => cName !== name));
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    
    const coursesForAI = user.subjects || [];
    const teachersForAI = availableTeachers.filter(t => selectedTeachers.includes(t.id)).map(t => `${t.name} (can teach: ${t.subjects?.join(', ') || 'N/A'})`);
    const classroomsForAI = selectedClassrooms;
    const timeSlotsForAI = timeSlots.map(ts => `${ts.day} ${ts.from}-${ts.to}`);

    // We get student groups by finding all unique group names from all users of type 'student'
    const studentGroupsForAI = ["Group A", "Group B"]; // Placeholder - should be fetched dynamically

    const result = await generateTimetableAction(
      coursesForAI,
      teachersForAI,
      classroomsForAI,
      timeSlotsForAI,
      studentGroupsForAI,
    );

    if(result.error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: result.error,
      });
      setIsLoading(false);
    } else if (result.schedule) {
      const saveResult = await saveScheduleAction(result.schedule);
      setIsLoading(false);
      if (saveResult.error) {
         toast({
            variant: "destructive",
            title: "Failed to Save Schedule",
            description: saveResult.error,
        });
      } else {
        setSchedule(result.schedule);
        toast({
            title: "Success!",
            description: "Timetable generated and saved successfully.",
        });
        router.push('/');
      }
    }
  };

  const isGenerationDisabled = useMemo(() => {
    return isLoading || !user.subjects?.length || !selectedTeachers.length || !selectedClassrooms.length || !timeSlots.length;
  }, [isLoading, user.subjects, selectedTeachers, selectedClassrooms, timeSlots]);

  const adminSubjects = useMemo(() => {
    return user.subjects || [];
  }, [user.subjects]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Data Management</h1>
          <p className="text-muted-foreground">Input all necessary data to generate a timetable.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerationDisabled} size="lg" className="w-full md:w-auto">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate Timetable
        </Button>
      </div>
      
      <Tabs defaultValue="subjects" className="w-full">
         <div className="overflow-x-auto pb-2">
           <TabsList className="inline-grid w-max grid-flow-col">
            <TabsTrigger value="subjects"><Book className="mr-2 h-4 w-4" />Subjects</TabsTrigger>
            <TabsTrigger value="teachers"><Users className="mr-2 h-4 w-4" />Teachers</TabsTrigger>
            <TabsTrigger value="classrooms"><School className="mr-2 h-4 w-4" />Classrooms</TabsTrigger>
            <TabsTrigger value="time-slots"><Clock className="mr-2 h-4 w-4" />Time Slots</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="subjects">
          <SubjectsSection subjects={adminSubjects} />
        </TabsContent>
        <TabsContent value="teachers">
          <TeachersSection 
            availableTeachers={availableTeachers} 
            selectedTeachers={selectedTeachers}
            onTeacherSelectionChange={handleTeacherSelection}
            isLoading={isTeachersLoading}
          />
        </TabsContent>
        <TabsContent value="classrooms">
          <ClassroomsSection 
            selectedClassrooms={selectedClassrooms}
            onClassroomSelectionChange={handleClassroomSelection}
          />
        </TabsContent>
        <TabsContent value="time-slots">
          <TimeSlotsSection />
        </TabsContent>
      </Tabs>
      
      <Separator />

      <UserManagementSection adminSubjects={adminSubjects} />

    </div>
  );
}
