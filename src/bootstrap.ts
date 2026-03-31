import { getMe } from "@/api/auth";

export async function bootstrap() {
  await getMe();
}
