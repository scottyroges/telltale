import { notFound } from "next/navigation";
import { serverTRPC } from "@/lib/trpc/server";
import { InterviewSession } from "@/components/interview/interview-session";

type PageProps = {
  params: Promise<{ interviewId: string }>;
};

export default async function InterviewPage({ params }: PageProps) {
  const { interviewId } = await params;
  const trpc = await serverTRPC();

  // Fetch interview and messages
  const interview = await trpc.interview.getById({ id: interviewId });

  if (!interview) {
    notFound();
  }

  const messages = await trpc.interview.getMessages({ interviewId });

  return (
    <InterviewSession
      interviewId={interview.id}
      bookId={interview.bookId}
      topic={interview.topic}
      status={interview.status}
      initialMessages={messages}
    />
  );
}
