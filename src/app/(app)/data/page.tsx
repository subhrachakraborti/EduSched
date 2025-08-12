"use client";

import React, { useState, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useSchedule } from '@/context/schedule-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Book, School, Users, Clock, UsersRound, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateTimetableAction } from '@/app/actions';
import { useRouter } from 'next/navigation';

type InputForm = {
  name: string;
};

type SlotForm = {
  slot: string;
}

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

export default function DataManagementPage() {
  const { 
    courses, addCourse, removeCourse, 
    teachers, addTeacher, removeTeacher, 
    classrooms, addClassroom, removeClassroom, 
    timeSlots, addTimeSlot, removeTimeSlot,
    studentGroups, addStudentGroup, removeStudentGroup,
    setIsLoading, setSchedule, isLoading
  } = useSchedule();
  
  const { toast } = useToast();
  const router = useRouter();

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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
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
    </div>
  );
}
