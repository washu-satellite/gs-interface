import { auth } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: await headers()
    });
  } catch (e) {
    redirect("/sign-in");
  }

  if (!session) {
    redirect("/sign-in");
  }

  redirect("/dashboard/command");
}
