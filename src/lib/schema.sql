-- schema.sql for edusched database

-- Creates a custom type for user roles to ensure data consistency.
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');

-- Table to store user details.
-- The 'id' column will be the primary key and should correspond to the Firebase Auth UID.
CREATE TABLE public.users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  dob DATE,
  "type" user_role NOT NULL,
  subjects TEXT[], -- Array of subject codes, relevant for teachers
  "group" TEXT     -- The student's group, e.g., 'Group A'
);

-- Table to store the generated timetable schedule.
CREATE TABLE public.timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day TEXT NOT NULL,
  "time" TEXT NOT NULL,
  course TEXT NOT NULL,
  teacher TEXT NOT NULL,
  classroom TEXT NOT NULL,
  student_group TEXT NOT NULL
);

-- Table to log student attendance records.
-- A composite primary key on (student_id, date, subject) prevents duplicate entries
-- for the same student, for the same subject, on the same day.
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.users(id),
  "date" DATE NOT NULL,
  subject TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_attendance_record UNIQUE (student_id, "date", subject)
);

-- Optional: Comments to explain the schema for future reference.
COMMENT ON COLUMN public.users.id IS 'Corresponds to Firebase Auth UID.';
COMMENT ON COLUMN public.users.subjects IS 'Array of subject codes for teachers.';
COMMENT ON COLUMN public.users.group IS 'The student''s assigned group.';
COMMENT ON TABLE public.attendance IS 'Logs student attendance. Composite key prevents duplicates.';
