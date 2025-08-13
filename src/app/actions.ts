
'use server';

import { generateSchedule } from '@/ai/flows/generate-schedule';
import type { ScheduleEntry, User, AttendanceEntry } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { parse, isValid, format } from 'date-fns';

type SessionScan = {
  studentId: string;
  studentName: string;
  date: string; // ddmmyy
  subject: string;
};

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
    scans: SessionScan[],
    markerId: string
): Promise<{ success?: boolean; count?: number; error?: string }> {
    try {
        const attendanceRecords: Omit<AttendanceEntry, 'id' | 'created_at'>[] = [];
        const uniqueEntries = new Set<string>();

        // Fetch all relevant student names in one go
        const studentIds = [...new Set(scans.map(scan => scan.studentId))];
        if (studentIds.length === 0) {
            return { error: "No student IDs were provided." };
        }
        
        const { data: studentData, error: studentError } = await supabase
            .from('users')
            .select('id, name')
            .in('id', studentIds);

        if (studentError) {
            console.error("Error fetching student data:", studentError);
            return { error: "Could not retrieve student details from the database." };
        }
        
        const studentNameMap = new Map(studentData.map(u => [u.id, u.name]));

        for (const scan of scans) {
            const parsedDate = parse(scan.date, 'ddMMyy', new Date());
            if (!isValid(parsedDate)) {
                console.warn(`Skipping record with invalid date format: ${scan.date}`);
                continue;
            }
            const dateForDb = format(parsedDate, 'yyyy-MM-dd');
            
            // The student name is now retrieved from the map, not from the input `scan` object
            const studentName = studentNameMap.get(scan.studentId);

            if (!studentName) {
                console.warn(`Skipping record for unknown student ID: ${scan.studentId}`);
                continue;
            }

            const uniqueKey = `${scan.studentId}-${dateForDb}-${scan.subject}`;
            if (uniqueEntries.has(uniqueKey)) {
                continue;
            }

            attendanceRecords.push({
                student_id: scan.studentId,
                date: dateForDb,
                subject_code: scan.subject,
                marked_by: markerId,
            });
            uniqueEntries.add(uniqueKey);
        }

        if (attendanceRecords.length === 0) {
            return { error: "No valid new attendance records to save." };
        }

        const { error: insertError } = await supabase.from('attendance').insert(attendanceRecords);

        if (insertError) {
            console.error("Error inserting attendance records:", insertError);
            if (insertError.code === '23505') { // PostgreSQL unique violation
                return { error: 'Some attendance records already exist and were not saved again.' };
            }
            return { error: 'Failed to save attendance records to the database.' };
        }

        return { success: true, count: attendanceRecords.length };

    } catch (e) {
        console.error('Failed to record attendance:', e);
        return { error: 'An unexpected error occurred while saving attendance.' };
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

        const { data: existingAttendance, error: checkError } = await supabase
            .from('attendance')
            .select('id')
            .eq('student_id', studentId)
            .eq('date', dateForDb)
            .eq('subject_code', subject)
            .limit(1);

        if (checkError) {
            console.error('Error checking attendance:', checkError.message);
            return { error: 'Failed to check existing attendance.' };
        }

        if (existingAttendance && existingAttendance.length > 0) {
            return { error: `Attendance for ${studentName} already recorded for this subject today.` };
        }

        const { error: insertError } = await supabase
            .from('attendance')
            .insert({
                student_id: studentId,
                date: dateForDb,
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
        group: userData.group,
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
