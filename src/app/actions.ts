
'use server';

import { generateSchedule } from '@/ai/flows/generate-schedule';
import type { ScheduleEntry, User } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

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
        const match = qrData.match(/^(.+?)-(\d{4}-\d{2}-\d{2})-(.+)$/);

        if (!match) {
            return { error: 'Invalid QR code format.' };
        }

        const [, studentId, date, subject] = match;

        if (!studentId || !date || !subject) {
            return { error: 'Invalid QR code data.' };
        }

        const { data: studentData, error: studentError } = await supabase
            .from('users')
            .select('name')
            .eq('id', studentId)
            .eq('type', 'student')
            .single();

        if (studentError || !studentData) {
            console.error("Student not found error:", studentError)
            return { error: 'Student not found.' };
        }
        const studentName = studentData.name;

        const { data: existingAttendance, error: checkError } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', studentId)
            .eq('date', date)
            .eq('subject_code', subject)
            .limit(1);

        if (checkError) {
            console.error('Error checking attendance:', checkError);
            return { error: 'Failed to check existing attendance.' };
        }

        if (existingAttendance && existingAttendance.length > 0) {
            return { error: `Attendance for ${studentName} already recorded.` };
        }

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

export async function createUserAction(
  userData: Omit<User, 'id'> & { email: string; password?: string }
): Promise<{ user?: User; error?: string }> {
  try {
    if (!userData.password) {
      return { error: "Password is required." };
    }

    const admin = await getFirebaseAdmin();
    const auth = admin.auth();

    // 1. Create user in Firebase Auth
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
        subjects: Array.isArray(userData.subjects) ? userData.subjects : userData.subjects?.split(',').map(s => s.trim()),
        group: userData.group,
    };

    // 2. Insert user data into Supabase
    const { error: supabaseError } = await supabase
      .from('users')
      .insert(newUser);

    if (supabaseError) {
      // If Supabase insert fails, we should delete the user from Firebase Auth
      // to avoid orphaned auth accounts.
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

    

    