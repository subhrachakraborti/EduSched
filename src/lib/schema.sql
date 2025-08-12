-- Create Users table
CREATE TABLE public.users (
  id TEXT PRIMARY KEY NOT NULL, -- Corresponds to Firebase Auth UID
  name TEXT NOT NULL,
  dob DATE,
  "type" TEXT NOT NULL CHECK ("type" IN ('admin', 'teacher', 'student')),
  subjects TEXT[], -- Array of subject codes for teachers
  "group" TEXT -- Student group name
);

-- Create Timetable table
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day TEXT NOT NULL,
  "time" TEXT NOT NULL,
  course TEXT NOT NULL,
  teacher_id TEXT REFERENCES public.users(id),
  classroom TEXT NOT NULL,
  student_group TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.users(id),
  "date" DATE NOT NULL,
  subject_code TEXT NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT true,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  recorded_by_id TEXT REFERENCES public.users(id), -- Teacher or Admin who scanned
  UNIQUE(student_id, "date", subject_code)
);
