
"use client";

import React, { useMemo, useState } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSchedule } from '@/context/schedule-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Book, School, Users, Clock, UsersRound, Trash2, Loader2, FileWarning, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateTimetableAction, createUserAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type InputForm = {
  name: string;
};

type SlotForm = {
  slot: string;
}

const userSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format." }),
  type: z.enum(["student", "teacher"]),
  subjects: z.string().min(1, { message: "Subjects are required." }),
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

interface DataSectionProps<T extends { id: string; name: string } | { id: string; slot: string }> {
  title: string;
  Icon: React.ElementType;
  data: T[];
  onAdd: (item: any) => void;
  onRemove: (id: string) => void;
  formType: 'name' | 'slot';
}

function DataSection<T extends { id: string; name: string } | { id: string; slot: string }>({ title, Icon, data, onAdd, onRemove, formType }: DataSectionProps<T>) {
  const { register, handleSubmit, reset } = useForm<InputForm & SlotForm>();

  const onSubmit: SubmitHandler<InputForm & SlotForm> = (formData) => {
    onAdd(formData);
    reset();
  };

  const isSlotForm = (item: any): item is { slot: string } => formType === 'slot';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="mb-4 flex gap-2">
          <Input {...register(formType, { required: true })} placeholder={`New ${formType}...`} />
          <Button type="submit">Add</Button>
        </form>
        <div className="max-h-60 overflow-y-auto rounded-md border">
          <Table>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{isSlotForm(item) ? item.slot : (item as {name: string}).name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && <TableRow><TableCell>No data added yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function UserManagementSection() {
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
        defaultValues: { type: "student" }
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
                    
                    <div className="space-y-2">
                        <Label htmlFor="subjects">Subjects</Label>
                        <Input id="subjects" {...register("subjects")} placeholder="Comma-separated, e.g., Mathematics,Physics" />
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
    courses, addCourse, removeCourse, 
    teachers, addTeacher, removeTeacher, 
    classrooms, addClassroom, removeClassroom, 
    timeSlots, addTimeSlot, removeTimeSlot,
    studentGroups, addStudentGroup, removeStudentGroup,
    setIsLoading, setSchedule, isLoading
  } = useSchedule();
  
  const { toast } = useToast();
  const router = useRouter();

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

  const handleGenerate = async () => {
    setIsLoading(true);
    const result = await generateTimetableAction(
      courses.map(c => c.name),
      teachers.map(t => t.name),
      classrooms.map(c => c.name),
      timeSlots.map(ts => ts.slot),
      studentGroups.map(sg => sg.name)
    );
    setIsLoading(false);

    if(result.error) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: result.error,
      });
    } else if (result.schedule) {
      setSchedule(result.schedule);
      toast({
        title: "Success!",
        description: "Timetable generated successfully.",
      });
      router.push('/');
    }
  };

  const isGenerationDisabled = useMemo(() => {
    return isLoading || [courses, teachers, classrooms, timeSlots, studentGroups].some(arr => arr.length === 0);
  }, [isLoading, courses, teachers, classrooms, timeSlots, studentGroups]);

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Data Management</h1>
          <p className="text-muted-foreground">Input all necessary data to generate a timetable.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerationDisabled} size="lg">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate Timetable
        </Button>
      </div>
      
      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
          <TabsTrigger value="time-slots">Time Slots</TabsTrigger>
          <TabsTrigger value="student-groups">Student Groups</TabsTrigger>
        </TabsList>
        <TabsContent value="courses">
          <DataSection title="Courses" Icon={Book} data={courses} onAdd={addCourse} onRemove={removeCourse} formType="name" />
        </TabsContent>
        <TabsContent value="teachers">
          <DataSection title="Teachers" Icon={Users} data={teachers} onAdd={addTeacher} onRemove={removeTeacher} formType="name" />
        </TabsContent>
        <TabsContent value="classrooms">
          <DataSection title="Classrooms" Icon={School} data={classrooms} onAdd={addClassroom} onRemove={removeClassroom} formType="name" />
        </TabsContent>
        <TabsContent value="time-slots">
          <DataSection title="Time Slots" Icon={Clock} data={timeSlots} onAdd={addTimeSlot} onRemove={removeTimeSlot} formType="slot" />
        </TabsContent>
        <TabsContent value="student-groups">
          <DataSection title="Student Groups" Icon={UsersRound} data={studentGroups} onAdd={addStudentGroup} onRemove={removeStudentGroup} formType="name" />
        </TabsContent>
      </Tabs>
      
      <Separator />

      <UserManagementSection />

    </div>
  );
}

    