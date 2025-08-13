# EduSched: AI-Powered Timetable Management & Attendance

EduSched is a modern, full-stack web application designed to streamline the complex process of school timetable generation and attendance tracking. It leverages the power of Generative AI to create conflict-free schedules and provides a seamless QR code-based system for marking student attendance. It also includes a digital library system for issuing books.

The application is built with a modern tech stack, featuring a Next.js frontend, Firebase for user authentication, and Supabase for the database backend.

## ✨ Core Features

*   **AI-Powered Timetable Generation**: Admins can input available subjects, teachers, classrooms, and time slots. The AI then generates an optimized, conflict-free timetable.
*   **Dynamic Data Management**: A dedicated interface for admins to prepare data for the AI generator. Admins select available teachers and classrooms from lists, define weekly time slots, and manage the subjects to be scheduled.
*   **Role-Based Access Control**:
    *   **Admin**: Full control over the system. Manages users, prepares data for the AI, generates the timetable, views all issued library books, and can free them.
    *   **Teacher**: Can view the master timetable, scan student QR codes to take attendance, and download attendance lists for their sessions.
    *   **Student**: Can view the master timetable, see a personalized attendance overview for their subjects, generate unique QR codes for class attendance, and issue books from the library.
*   **Secure User Authentication**: User login is handled securely through **Firebase Authentication**, with user profiles and roles managed in a Supabase database.
*   **Robust Database Backend**: All application data, including user profiles, timetables, attendance records, and issued books, is stored and managed in a **Supabase** PostgreSQL database.
*   **Dynamic QR Code System**:
    *   Students generate a unique, time-sensitive QR code for each class subject.
    *   Teachers and Admins use the built-in scanner to instantly record attendance for a specific session.
    *   Attendance records are saved directly to the database.
*   **Downloadable Attendance Reports**: Teachers can download a PDF of attendees for any given session.
*   **Student Attendance Dashboard**: Students see a colorful, personalized dashboard with semi-circle gauges visualizing their attendance percentage for each subject.
*   **Library Management System**:
    *   Students can search for books by code and issue them to their account.
    *   A student's dashboard shows the list of books they have currently checked out.
    *   Admins can view a master list of all issued books and mark them as returned ("free" them).
*   **Interactive Timetable View**: A clean, table-based view of the generated schedule that is easy to read and use.

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
*   **AI/Generative AI**: [Genkit (by Google)](https://firebase.google.com/docs/genkit)
*   **Authentication**: [Firebase Authentication](https://firebase.google.com/docs/auth)
*   **Database**: [Supabase](https://supabase.io/) (PostgreSQL)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
*   **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react)
*   **Deployment**: Ready for Firebase App Hosting

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v20 or later)
*   npm or yarn
*   A Firebase project
*   A Supabase project

### Setup & Installation

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd <repository-name>
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project and add your Firebase and Supabase credentials. This file is ignored by Git.

    ```env
    # Firebase Client Credentials (for client-side SDK)
    NEXT_PUBLIC_FIREBASE_API_KEY=
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
    NEXT_PUBLIC_FIREBASE_APP_ID=

    # Supabase Credentials
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=

    # Firebase Admin Credentials (for server-side actions like user creation)
    # Ensure the private key is correctly formatted with newlines (\n)
    FIREBASE_PROJECT_ID=
    FIREBASE_CLIENT_EMAIL=
    FIREBASE_PRIVATE_KEY=
    ```

4.  **Set up the Supabase Database:**
    *   In your Supabase project's SQL Editor, run the queries from `database_schema.sql` to create the necessary tables (`users`, `timeline`, `attendance`, `issued_books`).
    *   Make sure you have an `admin` user in your `users` table to be able to log in and use the admin features. You can add one manually in the Supabase table editor or use the app's user creation form after logging in as an initial admin.

### Running the Application

1.  **Start the development server:**
    ```sh
    npm run dev
    ```
    This will start the Next.js application, typically on `http://localhost:9002`.

2.  **Start the Genkit development server (in a separate terminal):**
    ```sh
    npm run genkit:watch
    ```
    This is required for the AI timetable generation feature to work.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
