"use client";

import { usePathname } from "next/navigation";
import { IconSearch } from "@/components/ui";

export function TopSearch() {
  const pathname = usePathname();
  const onSessions = pathname.startsWith("/sessions");

  return (
    <form className="top-search" action={onSessions ? "/sessions" : "/patients"}>
      <IconSearch />
      <input
        name="q"
        placeholder={onSessions ? "Search sessions" : "Search patients"}
      />
    </form>
  );
}
