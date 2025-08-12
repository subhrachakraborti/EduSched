"use client";

import React, { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, FileWarning } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScheduleEntry } from "@/lib/types";

function EditableCell({
  value: initialValue,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onSave(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className="h-8"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="min-h-[2rem] w-full cursor-pointer rounded-md p-2 hover:bg-muted"
    >
      {value}
    </div>
  );
}

export default function DashboardPage() {
  const { schedule, isLoading, updateScheduleEntry } = useSchedule();

  const handleCellSave = (id: string, field: keyof ScheduleEntry, value: string) => {
    updateScheduleEntry(id, field, value);
  };

  const renderSchedule = () => {
    if (isLoading) {
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
          <Button asChild>
            <Link href="/data">Go to Data Management</Link>
          </Button>
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
              <TableHead>Student Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <EditableCell value={entry.day} onSave={(v) => handleCellSave(entry.id, 'day', v)} />
                </TableCell>
                <TableCell>
                  <EditableCell value={entry.time} onSave={(v) => handleCellSave(entry.id, 'time', v)} />
                </TableCell>
                <TableCell>
                  <EditableCell value={entry.course} onSave={(v) => handleCellSave(entry.id, 'course', v)} />
                </TableCell>
                <TableCell>
                  <EditableCell value={entry.teacher} onSave={(v) => handleCellSave(entry.id, 'teacher', v)} />
                </TableCell>
                <TableCell>
                  <EditableCell value={entry.classroom} onSave={(v) => handleCellSave(entry.id, 'classroom', v)} />
                </TableCell>
                <TableCell>
                  <EditableCell value={entry.studentGroup} onSave={(v) => handleCellSave(entry.id, 'studentGroup', v)} />
                </TableCell>
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
