"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMasterEligibilityApi,
  verifyMasterTraderApi,
} from "@/lib/api/master-trader-api";

export function masterEligibilityQueryKey(traderWalletAddress?: string) {
  return ["master-eligibility", traderWalletAddress?.toLowerCase()] as const;
}

export function useMasterEligibility(traderWalletAddress?: string) {
  return useQuery({
    queryKey: masterEligibilityQueryKey(traderWalletAddress),
    queryFn: () => getMasterEligibilityApi(traderWalletAddress as string),
    enabled: Boolean(traderWalletAddress),
    refetchInterval: (query) =>
      query.state.data?.status === "VERIFYING" ? 8_000 : false,
    staleTime: 10_000,
    retry: 1,
  });
}

export function useVerifyMaster(traderWalletAddress?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => verifyMasterTraderApi(traderWalletAddress as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: masterEligibilityQueryKey(traderWalletAddress),
      });
    },
  });
}
