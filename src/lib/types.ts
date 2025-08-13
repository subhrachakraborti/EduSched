
export interface User {
  id: string;
  name: string;
  dob: string;
  type: 'admin' | 'teacher' | 'student';
  subjects?: string[];
  group?: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
  subjects: string[];
}

export interface Classroom {
  id: string;
  name: string;
  subjects: string[];
}

export interface TimeSlot {
  id: string;
  day: string;
  from: string; // "09:00"
  to: string;   // "10:00"
}

export interface StudentGroup {
  id: string;
  name: string;
}

export interface ScheduleEntry {
  id: string;
  day: string;
  time: string;
  course: string;
  teacher: string;
  classroom: string;
}

export interface AttendanceEntry {
  id?: number;
  student_id: string; // This is a TEXT field referencing users.id
  date: string; // YYYY-MM-DD
  subject_code: string;
  marked_by: string; // This is a TEXT field referencing users.id
  created_at?: string;
}

export interface IssuedBook {
    id: number;
    student_id: string;
    book_code: string;
    issued_at: string;
    book_title: string | null;
    book_author: string | null;
    book_cover_url: string | null;
}
