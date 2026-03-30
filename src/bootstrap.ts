import { getMe } from "@/lib/auth";

export async function bootstrap() {
  await getMe();
}
