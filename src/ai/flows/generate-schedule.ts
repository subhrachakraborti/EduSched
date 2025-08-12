'use server';

/**
 * @fileOverview Generates an initial timetable based on courses, teachers, classrooms, time slots, and student groups.
 *
 * - generateSchedule - A function that handles the timetable generation process.
 * - GenerateScheduleInput - The input type for the generateSchedule function.
 * - GenerateScheduleOutput - The return type for the generateSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateScheduleInputSchema = z.object({
  courses: z.array(z.string()).describe('List of courses with details like name, code, and credits.'),
  teachers: z.array(z.string()).describe('List of teachers with availability and subjects they can teach.'),
  classrooms: z.array(z.string()).describe('List of classrooms with capacity and available time slots.'),
  timeSlots: z.array(z.string()).describe('List of available time slots with day and time.'),
  studentGroups: z.array(z.string()).describe('List of student groups with the courses they need to take.'),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const GenerateScheduleOutputSchema = z.object({
  schedule: z.string().describe('A conflict-free timetable in JSON format.'),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: GenerateScheduleInputSchema},
  output: {schema: GenerateScheduleOutputSchema},
  prompt: `You are a timetable generator expert. You are given the following data about courses, teachers, classrooms, time slots and student groups.

Generate a conflict-free timetable in JSON format based on the following information. Make sure that every class have a teacher, a classroom, a time slot and a student group.

Courses: {{{courses}}}
Teachers: {{{teachers}}}
Classrooms: {{{classrooms}}}
Time Slots: {{{timeSlots}}}
Student Groups: {{{studentGroups}}}`, 
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
