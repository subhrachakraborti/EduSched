import { AppLayout } from "@/components/app-layout";

export default function AppPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
