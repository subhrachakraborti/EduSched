export interface Course {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
}

export interface Classroom {
  id: string;
  name: string;
}

export interface TimeSlot {
  id: string;
  slot: string; // "Monday 9:00-10:00"
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
  studentGroup: string;
}
