import { auth } from "@/auth";
import ChannelTest from "@/components/ChannelTest";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div>
      <ChannelTest/>
    </div>
  );
}
