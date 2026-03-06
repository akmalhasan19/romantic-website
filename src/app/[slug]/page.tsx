import { RomanticExperiencePage } from "@/components/scene/RomanticExperiencePage";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RomanticExperiencePage slug={slug} />;
}