
"use client";

import React, { useMemo, useState } from 'react';
import { useForm, type SubmitHandler, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSchedule } from '@/context/schedule-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Book, School, Users, Clock, Trash2, Loader2, FileWarning, UserPlus, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateTimetableAction, createUserAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { CheckIcon } from 'lucide-react';

// Schemas for new data structures
const subjectSchema = z.object({ name: z.string().min(1, "Subject name is required") });
const teacherSchema = z.object({ name: z.string().min(1, "Teacher name is required"), subjects: z.array(z.string()).min(1, "Assign at least one subject") });
const classroomSchema = z.object({ name: z.string().min(1, "Classroom name is required"), subjects: z.array(z.string()).min(1, "Assign at least one subject") });
const timeSlotSchema = z.object({ 
    day: z.string().min(1, "Day is required"),
    from: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
    to: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
});

type SubjectFormData = z.infer<typeof subjectSchema>;
type TeacherFormData = z.infer<typeof teacherSchema>;
type ClassroomFormData = z.infer<typeof classroomSchema>;
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

function MultiSelect({ control, name, options, placeholder }: { control: any, name: string, options: {value: string, label: string}[], placeholder: string }) {
    const { fields, append, remove } = useFieldArray({ control, name });
    const selectedValues = fields.map((field: any) => field.value);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                    <span className="truncate">
                        {selectedValues.length > 0 ? selectedValues.join(', ') : placeholder}
                    </span>
                    <PlusCircle className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandEmpty>No subjects found.</CommandEmpty>
                    <CommandGroup>
                        {options.map((option) => (
                            <CommandItem
                                key={option.value}
                                onSelect={() => {
                                    const index = selectedValues.findIndex((v: string) => v === option.value);
                                    if (index > -1) {
                                        remove(index);
                                    } else {
                                        append({ value: option.value });
                                    }
                                }}
                            >
                                <CheckIcon
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedValues.includes(option.value) ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function SubjectsSection() {
    const { subjects, addSubject, removeSubject } = useSchedule();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<SubjectFormData>({ resolver: zodResolver(subjectSchema) });
    const onSubmit: SubmitHandler<SubjectFormData> = (data) => { addSubject(data); reset(); };
    return (
        <Card>
            <CardHeader><CardTitle>Subjects</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="mb-4 flex gap-2">
                    <Input {...register("name")} placeholder="New subject (e.g., Math101)" />
                    <Button type="submit">Add</Button>
                </form>
                {errors.name && <p className="text-sm text-destructive mb-2">{errors.name.message}</p>}
                <DataTable columns={['Subject']} data={subjects.map(s => [s.name])} onRemove={removeSubject} ids={subjects.map(s => s.id)} />
            </CardContent>
        </Card>
    );
}

function TeachersSection() {
    const { teachers, addTeacher, removeTeacher, subjects } = useSchedule();
    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TeacherFormData>({ resolver: zodResolver(teacherSchema), defaultValues: { subjects: [] }});
    const onSubmit: SubmitHandler<TeacherFormData> = (data) => { addTeacher(data); reset(); };
    const subjectOptions = subjects.map(s => ({ value: s.name, label: s.name }));

    return (
        <Card>
            <CardHeader><CardTitle>Teachers</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="mb-4 space-y-2">
                    <Input {...register("name")} placeholder="Teacher's name" />
                    <Controller
                        control={control}
                        name="subjects"
                        render={({ field }) => (
                            <MultiSelect
                                control={control}
                                name="subjects"
                                options={subjectOptions}
                                placeholder="Select subjects..."
                            />
                        )}
                    />
                    <Button type="submit" className="w-full">Add Teacher</Button>
                </form>
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                {errors.subjects && <p className="text-sm text-destructive">{errors.subjects.message}</p>}
                <DataTable columns={['Teacher', 'Subjects']} data={teachers.map(t => [t.name, t.subjects.join(', ')])} onRemove={removeTeacher} ids={teachers.map(t => t.id)} />
            </CardContent>
        </Card>
    );
}

function ClassroomsSection() {
    const { classrooms, addClassroom, removeClassroom, subjects } = useSchedule();
    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ClassroomFormData>({ resolver: zodResolver(classroomSchema), defaultValues: { subjects: [] } });
    const onSubmit: SubmitHandler<ClassroomFormData> = (data) => { addClassroom(data); reset(); };
    const subjectOptions = subjects.map(s => ({ value: s.name, label: s.name }));
    
    return (
        <Card>
            <CardHeader><CardTitle>Classrooms</CardTitle></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="mb-4 space-y-2">
                    <Input {...register("name")} placeholder="Classroom name (e.g., Room 101)" />
                     <Controller
                        control={control}
                        name="subjects"
                        render={({ field }) => (
                            <MultiSelect
                                control={control}
                                name="subjects"
                                options={subjectOptions}
                                placeholder="Select subjects for this room..."
                            />
                        )}
                    />
                    <Button type="submit" className="w-full">Add Classroom</Button>
                </form>
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                {errors.subjects && <p className="text-sm text-destructive">{errors.subjects.message}</p>}
                <DataTable columns={['Classroom', 'Allowed Subjects']} data={classrooms.map(c => [c.name, c.subjects.join(', ')])} onRemove={removeClassroom} ids={classrooms.map(c => c.id)} />
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
            <CardHeader><CardTitle>Time Slots</CardTitle></CardHeader>
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
                <DataTable columns={['Day', 'From', 'To']} data={timeSlots.map(ts => [ts.day, ts.from, ts.to])} onRemove={removeTimeSlot} ids={timeSlots.map(ts => ts.id)} />
            </CardContent>
        </Card>
    );
}

function DataTable({ columns, data, onRemove, ids }: { columns: string[], data: string[][], onRemove: (id: string) => void, ids: string[] }) {
    return (
        <div className="max-h-60 overflow-y-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length > 0 ? data.map((row, rowIndex) => (
                        <TableRow key={ids[rowIndex]}>
                            {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => onRemove(ids[rowIndex])}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )) : <TableRow><TableCell colSpan={columns.length + 1}>No data added yet.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </div>
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
                                    {adminSubjects.map((subject) => (
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
    subjects,
    teachers, 
    classrooms,
    timeSlots,
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
    
    // Convert the data to the format expected by the AI
    const coursesForAI = subjects.map(s => s.name);
    const teachersForAI = teachers.map(t => `${t.name} (can teach: ${t.subjects.join(', ')})`);
    const classroomsForAI = classrooms.map(c => `${c.name} (for subjects: ${c.subjects.join(', ')})`);
    const timeSlotsForAI = timeSlots.map(ts => `${ts.day} ${ts.from}-${ts.to}`);

    // For now, student groups are managed via user creation. We need a way to get them for the AI.
    // This is a placeholder and should be improved.
    const studentGroupsForAI = ["Group A", "Group B"]; // Placeholder

    const result = await generateTimetableAction(
      coursesForAI,
      teachersForAI,
      classroomsForAI,
      timeSlotsForAI,
      studentGroupsForAI
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
    return isLoading || [subjects, teachers, classrooms, timeSlots].some(arr => arr.length === 0);
  }, [isLoading, subjects, teachers, classrooms, timeSlots]);

  const adminSubjects = useMemo(() => {
    return subjects.map(s => s.name) || [];
  }, [subjects]);

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
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
            <TabsTrigger value="time-slots">Time Slots</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="subjects">
          <SubjectsSection />
        </TabsContent>
        <TabsContent value="teachers">
          <TeachersSection />
        </TabsContent>
        <TabsContent value="classrooms">
          <ClassroomsSection />
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

    