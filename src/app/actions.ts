'use server';

import { generateSchedule } from '@/ai/flows/generate-schedule';
import type { ScheduleEntry } from '@/lib/types';

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
