-- Create users table
CREATE TABLE public.users (
  id TEXT PRIMARY KEY NOT NULL, -- Corresponds to Firebase Auth UID
  name TEXT NOT NULL,
  dob DATE,
  "type" TEXT NOT NULL CHECK ("type" IN ('admin', 'teacher', 'student')),
  subjects TEXT[], -- Array of subject codes for teachers
  "group" TEXT -- Student group name
);

-- Create timetable table
CREATE TABLE public.timetable (
    id SERIAL PRIMARY KEY,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    course_name TEXT NOT NULL,
    teacher_id TEXT REFERENCES public.users(id),
    classroom_name TEXT NOT NULL,
    student_group TEXT NOT NULL
);

-- Create attendance table
CREATE TABLE public.attendance (
    id SERIAL PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.users(id),
    date DATE NOT NULL,
    subject_code TEXT NOT NULL,
    marked_by TEXT NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date, subject_code)
);
