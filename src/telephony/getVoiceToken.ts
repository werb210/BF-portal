import { Contracts } from "bf-contracts";
import { requestWithContract } from "@/lib/contractsApi";

export async function getTelephonyToken() {
  const res = await requestWithContract(Contracts.telephonyToken, {
    method: "GET"
  });

  return res.token;
}

export async function getVoiceToken() {
  return getTelephonyToken();
}
