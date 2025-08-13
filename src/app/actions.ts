
'use server';

import { generateSchedule } from '@/ai/flows/generate-schedule';
import type { ScheduleEntry, User } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { parse, isValid, format } from 'date-fns';

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

export async function batchRecordAttendanceAction(
    studentIds: string[],
    subjectCode: string,
    markerId: string
): Promise<{ success?: boolean; count?: number; error?: string }> {
    try {
        if (!studentIds || studentIds.length === 0) {
            return { error: 'No student IDs provided.' };
        }
        if (!subjectCode) {
            return { error: 'No subject code provided.' };
        }

        const today = format(new Date(), 'yyyy-MM-dd');

        // Deduplicate student IDs
        const uniqueStudentIds = [...new Set(studentIds)];
        
        const attendanceRecords = uniqueStudentIds.map(studentId => ({
            student_id: studentId,
            date: today,
            subject_code: subjectCode,
            marked_by: markerId,
        }));

        const { error: insertError, count } = await supabase
            .from('attendance')
            .insert(attendanceRecords, { onConflict: 'student_id, date, subject_code' });

        if (insertError) {
            console.error("Error inserting attendance records:", insertError);
            return { error: 'Failed to save attendance records to the database. ' + insertError.message };
        }

        return { success: true, count: count ?? 0 };

    } catch (e: any) {
        console.error('Failed to record attendance:', e);
        return { error: 'An unexpected error occurred while saving attendance: ' + e.message };
    }
}


export async function recordAttendanceAction(
    qrData: string,
    markerId: string
): Promise<{ studentName?: string; error?: string }> {
    try {
        const match = qrData.match(/^([^.]+)\.(\d{6})\.(.+)$/);
        
        if (!match) {
            return { error: 'Invalid QR code format.' };
        }

        const [, studentId, dateStr, subject] = match;

        if (!studentId || !dateStr || !subject) {
            return { error: 'Invalid QR code data.' };
        }
        
        const parsedDate = parse(dateStr, 'ddMMyy', new Date());
        
        if (!isValid(parsedDate)) {
            console.error(`Invalid date parsed from QR code: ${dateStr}`);
            return { error: 'Invalid date format in QR code.'};
        }

        const dateForDb = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

        const { data: studentData, error: studentError } = await supabase
            .from('users')
            .select('name')
            .eq('id', studentId)
            .eq('type', 'student')
            .single();

        if (studentError || !studentData) {
            console.error("Student not found error:", studentError);
            return { error: `Student not found for ID: ${studentId}` };
        }
        const studentName = studentData.name;

        const { error: insertError } = await supabase
            .from('attendance')
            .insert({
                student_id: studentId,
                date: dateForDb,
                subject_code: subject,
                marked_by: markerId,
            }, { onConflict: 'student_id, date, subject_code' });
        
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

export async function createUserAction(
  userData: Omit<User, 'id'> & { email: string; password?: string; group?: string }
): Promise<{ user?: User; error?: string }> {
  try {
    if (!userData.password) {
      return { error: "Password is required." };
    }

    const admin = await getFirebaseAdmin();
    const auth = admin.auth();

    const firebaseUser = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
    });
    
    const newUser: User = {
        id: firebaseUser.uid,
        name: userData.name,
        dob: userData.dob,
        type: userData.type,
        subjects: Array.isArray(userData.subjects) ? userData.subjects : (userData.subjects as string)?.split(',').map(s => s.trim()),
        group: userData.type === 'student' ? userData.group : undefined,
    };

    const { error: supabaseError } = await supabase
      .from('users')
      .insert(newUser);

    if (supabaseError) {
      await auth.deleteUser(firebaseUser.uid);
      console.error("Supabase user creation error:", supabaseError);
      return { error: "Failed to save user profile to database." };
    }

    return { user: newUser };

  } catch (error: any) {
    console.error("Create user error:", error);
    let errorMessage = "An unexpected error occurred during user creation.";
    if (error.code === 'auth/email-already-exists') {
        errorMessage = "An account with this email address already exists.";
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = "The password is not strong enough. It must be at least 6 characters.";
    }
    return { error: errorMessage };
  }
}

export async function fetchStudentNamesAction(studentIds: string[]): Promise<{ data?: {id: string, name: string}[], error?: string }> {
    if (!studentIds || studentIds.length === 0) {
        return { data: [] };
    }
    const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .in('id', studentIds);

    if (error) {
        console.error('Error fetching student names:', error);
        return { error: 'Could not fetch student names.' };
    }
    return { data: data ?? [] };
}
