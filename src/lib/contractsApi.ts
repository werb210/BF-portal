import { apiRequest } from "@/lib/api";

type ContractShape = {
  path: string;
  request?: { parse: (input: unknown) => unknown };
  response: { parse: (input: unknown) => unknown };
};

export async function requestWithContract<TContract extends ContractShape>(
  contract: TContract,
  init: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<ReturnType<TContract["response"]["parse"]>> {
  const requestBody =
    init.body === undefined
      ? undefined
      : contract.request
        ? contract.request.parse(init.body)
        : init.body;

  const response = await apiRequest(contract.path, {
    ...init,
    body:
      requestBody == null
        ? undefined
        : requestBody instanceof FormData
          ? requestBody
          : JSON.stringify(requestBody)
  });

  return contract.response.parse(response) as ReturnType<TContract["response"]["parse"]>;
}
