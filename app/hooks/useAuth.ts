"use client";

import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: () => fetch("/api/auth/user").then(res => res.json()),
    retry: false,
  });

  return { user, isLoading };
}
