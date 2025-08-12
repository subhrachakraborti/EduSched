
'use server';

import { generateSchedule } from '@/ai/flows/generate-schedule';
import type { ScheduleEntry, AttendanceEntry } from '@/lib/types';
import { promises as fs } from 'fs';
import path from 'path';

export async function generateTimetableAction(
  courses: string[],
  teachers: string[],
  classrooms: string[],
  timeSlots: string[],
  studentGroups: string[]
): Promise<{ schedule: ScheduleEntry[] | null; error?: string }> {
  try {
    if (!courses.length || !teachers.length || !classrooms.length || !timeSlots.length || !studentGroups.length) {
        return { schedule: null, error: 'Please provide all required data: courses, teachers, classrooms, time slots, and student groups.' };
    }

    const result = await generateSchedule({
      courses,
      teachers,
      classrooms,
      timeSlots,
      studentGroups,
    });
    
    try {
      const parsedSchedule = JSON.parse(result.schedule);
      
      if (!Array.isArray(parsedSchedule)) {
        throw new Error("Generated schedule is not in the expected array format.");
      }

      const scheduleWithIds = parsedSchedule.map(entry => ({...entry, id: crypto.randomUUID()}));
      
      return { schedule: scheduleWithIds as ScheduleEntry[] };

    } catch (parseError) {
      console.error("Error parsing generated schedule:", parseError);
      return { schedule: null, error: 'The AI returned a schedule in an invalid format. Please try again or refine your input data.' };
    }
  } catch (e) {
    console.error(e);
    return { schedule: null, error: 'Failed to generate schedule due to an unexpected error.' };
  }
}

export async function recordAttendanceAction(
    qrData: string
): Promise<{ message?: string; error?: string }> {
    try {
        const parts = qrData.split('-');
        if (parts.length !== 3) {
            return { error: 'Invalid QR code format.' };
        }
        const [studentId, date, subject] = parts;

        const filePath = path.join(process.cwd(), 'src', 'lib', 'attendance.json');
        
        let attendanceData: AttendanceEntry[] = [];
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            attendanceData = JSON.parse(fileContent);
        } catch (error) {
            // File might not exist yet, which is fine.
        }

        const alreadyExists = attendanceData.some(
            entry => entry.studentId === studentId && entry.date === date && entry.subject === subject
        );

        if (alreadyExists) {
            return { error: `Attendance for ${studentId} already recorded for this subject today.` };
        }

        const newEntry: AttendanceEntry = {
            studentId,
            date,
            subject,
            timestamp: new Date().toISOString()
        };

        attendanceData.push(newEntry);

        await fs.writeFile(filePath, JSON.stringify(attendanceData, null, 2), 'utf-8');

        return { message: `Attendance for ${studentId} recorded.` };

    } catch (e) {
        console.error('Failed to record attendance:', e);
        return { error: 'An unexpected error occurred while recording attendance.' };
    }
}

    