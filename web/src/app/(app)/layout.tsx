import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSidebarData } from "@/lib/sidebar";
import { PhpApiError } from "@/lib/phpApi";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let sidebarData;
  try {
    sidebarData = await getSidebarData();
  } catch (e) {
    if (e instanceof PhpApiError && e.status === 401) {
      redirect("/login");
    }
    throw e;
  }

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

  return (
    <AppShell sidebarData={sidebarData} phpAdminUrl={phpAdminUrl}>
      {children}
    </AppShell>
  );
}
