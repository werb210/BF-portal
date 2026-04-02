export type ContractSchema = Record<string, unknown>;
export const validateContract = <T>(data: T): T => data;
