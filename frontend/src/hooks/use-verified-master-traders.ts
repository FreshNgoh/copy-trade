"use client";

import { useQuery } from "@tanstack/react-query";
import { getVerifiedMasterTradersApi } from "@/lib/api/verified-master-api";

export function useVerifiedMasterTraders() {
  return useQuery({
    queryKey: ["verified-master-traders"],
    queryFn: getVerifiedMasterTradersApi,
    staleTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });
}
