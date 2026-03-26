export type AuthenticatedUser = {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
  roles?: string[];
  capabilities?: string[];
  [key: string]: unknown;
};
