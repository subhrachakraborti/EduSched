
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSchedule } from "@/context/schedule-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileWarning, Target } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScheduleEntry } from "@/lib/types";
import { fetchScheduleAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import attendanceData from '@/lib/attendance.json';

const GAUGE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function AttendanceGauge({ subject, present, total }: { subject: string, present: number, total: number }) {
  const percentage = total > 0 ? (present / total) * 100 : 0;
  
  const needle = useMemo(() => {
    // Correct angle calculation: 180 degrees is 0%, 0 degrees is 100%
    const angle = 180 - (180 * (percentage / 100));
    const length = 60; // Length of the needle
    const cx = 80; // Center x of the gauge container
    const cy = 80; // Center y of the gauge container
    const x = cx + length * Math.cos(angle * Math.PI / 180);
    const y = cy - length * Math.sin(angle * Math.PI / 180);
    return { x1: cx, y1: cy, x2: x, y2: y };
  }, [percentage]);

  return (
    <div className="flex flex-col items-center justify-center text-center">
       <div className="relative h-[80px] w-[160px]">
         <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                dataKey="value"
                startAngle={180}
                endAngle={0}
                data={[{value: 20}, {value: 20}, {value: 20}, {value: 20}, {value: 20}]}
                cx="50%"
                cy="100%"
                outerRadius={60}
                innerRadius={40}
                fill="#8884d8"
                paddingAngle={2}
              >
                {GAUGE_COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
           <svg className="absolute top-0 left-0 h-full w-full" style={{ overflow: 'visible' }}>
            <line {...needle} stroke="hsl(var(--foreground))" strokeWidth={2} />
            <circle cx={needle.x1} cy={needle.y1} r={4} fill="hsl(var(--foreground))" />
          </svg>
       </div>
      <p className="mt-2 font-semibold capitalize">{subject}</p>
      <p className="text-xl font-bold">{Math.round(percentage)}%</p>
      <p className="text-xs text-muted-foreground">({present}/{total} classes)</p>
    </div>
  );
}


function StudentAttendanceSection({ studentId }: { studentId: string }) {
    const studentAttendance = useMemo(() => {
        const studentData = attendanceData.find(entry => entry.id === studentId);
        if (!studentData) {
            return [];
        }

        return Object.entries(studentData)
            .filter(([key]) => key !== 'id')
            .map(([subject, value]) => {
                const [presentStr, totalStr] = (value as string).split('/');
                const present = parseInt(presentStr, 10);
                const total = parseInt(totalStr, 10);
                return { subject, present, total };
            });

    }, [studentId]);


    if (studentAttendance.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Target className="h-6 w-6" />
                    <CardTitle>Attendance Overview</CardTitle>
                </div>
                <CardDescription>Your attendance percentage for each subject.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {studentAttendance.map(({ subject, present, total }) => (
                        <AttendanceGauge 
                            key={subject}
                            subject={subject}
                            present={present}
                            total={total}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const { user, schedule, setSchedule, isLoading } = useSchedule();
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadSchedule = async () => {
        setIsFetching(true);
        const result = await fetchScheduleAction();
        if (result.error) {
            toast({ variant: 'destructive', title: 'Failed to load schedule', description: result.error });
        } else {
            setSchedule(result.schedule || []);
        }
        setIsFetching(false);
    }
    loadSchedule();
  }, [setSchedule, toast]);


  const renderSchedule = () => {
    if (isLoading || isFetching) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (schedule.length === 0) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed bg-card-foreground/5 p-8 text-center">
          <FileWarning className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No Timetable Generated</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Get started by adding your data and generating a new schedule.
          </p>
           {user?.type === 'admin' && (
                <Button asChild>
                    <Link href="/data">Go to Data Management</Link>
                </Button>
            )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Classroom</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.day}</TableCell>
                <TableCell>{entry.time}</TableCell>
                <TableCell>{entry.course}</TableCell>
                <TableCell>{entry.teacher}</TableCell>
                <TableCell>{entry.classroom}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to EduSched, {user?.name}!
        </p>
      </div>
      
      {user?.type === 'student' && user.id && <StudentAttendanceSection studentId={user.id} />}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            <CardTitle>Generated Timetable</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {renderSchedule()}
        </CardContent>
      </Card>
    </div>
  );
}
