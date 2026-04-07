import { MenuSessionScreen } from "@/components/MenuSessionScreen";

interface MenuSessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function MenuSessionPage({
  params,
}: MenuSessionPageProps) {
  const { sessionId } = await params;

  return <MenuSessionScreen sessionId={sessionId} />;
}
