
'use server';

import { generateSchedule } from '@/ai/flows/generate-schedule';
import type { ScheduleEntry, User } from '@/lib/types';
import { supabase } from '@/lib/supabase';

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
    qrData: string,
    markerId: string
): Promise<{ studentName?: string; error?: string }> {
    try {
        const parts = qrData.split('-');
        if (parts.length < 3) {
            return { error: 'Invalid QR code format.' };
        }
        
        const studentId = parts[0];
        const date = `${parts[1]}-${parts[2]}-${parts[3]}`;
        const subject = parts.slice(4).join('-');

        if (!studentId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !subject) {
            return { error: 'Invalid QR code data.' };
        }

        // 1. Check if student exists and get their name
        const { data: studentData, error: studentError } = await supabase
            .from('users')
            .select('name')
            .eq('id', studentId)
            .eq('type', 'student')
            .single();

        if (studentError || !studentData) {
            return { error: 'Student not found.' };
        }
        const studentName = studentData.name;

        // 2. Check if attendance is already recorded
        const { data: existingAttendance, error: checkError } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', studentId)
            .eq('date', date)
            .eq('subject_code', subject);

        if (checkError) {
            console.error('Error checking attendance:', checkError);
            return { error: 'Failed to check existing attendance.' };
        }

        if (existingAttendance && existingAttendance.length > 0) {
            return { error: `Attendance for ${studentName} already recorded.` };
        }

        // 3. Insert new attendance record
        const { error: insertError } = await supabase
            .from('attendance')
            .insert({
                student_id: studentId,
                date: date,
                subject_code: subject,
                marked_by: markerId,
            });
        
        if (insertError) {
            console.error('Error inserting attendance:', insertError);
            return { error: 'Failed to save attendance record.' };
        }

        return { studentName: studentName };

    } catch (e) {
        console.error('Failed to record attendance:', e);
        return { error: 'An unexpected error occurred while recording attendance.' };
    }
}
