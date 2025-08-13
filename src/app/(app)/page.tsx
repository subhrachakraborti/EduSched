
"use client";

import React, { useState, useEffect } from "react";
import { useSchedule } from "@/context/schedule-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileWarning } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScheduleEntry } from "@/lib/types";
import { fetchScheduleAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";


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
          Welcome to EduSched!
        </p>
      </div>

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
