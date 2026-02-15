import { notFound } from "next/navigation";
import { serverTRPC } from "@/lib/trpc/server";
import { InterviewSession } from "@/components/interview/interview-session";

type PageProps = {
  params: Promise<{ interviewId: string }>;
};

export default async function InterviewPage({ params }: PageProps) {
  const { interviewId } = await params;
  const trpc = await serverTRPC();

  // Fetch interview, messages, and book data
  const interview = await trpc.interview.getById({ id: interviewId });

  if (!interview) {
    notFound();
  }

  const [messages, book] = await Promise.all([
    trpc.interview.getMessages({ interviewId }),
    trpc.book.getById({ id: interview.bookId }),
  ]);

  if (!book) {
    notFound();
  }

  // Extract question prompt from book's bookQuestions
  const bookQuestion = book.bookQuestions.find(
    (bq) => bq.questionId === interview.questionId
  );

  if (!bookQuestion) {
    notFound();
  }

  const questionPrompt = bookQuestion.question.prompt;

  return (
    <InterviewSession
      interviewId={interview.id}
      bookId={interview.bookId}
      questionPrompt={questionPrompt}
      status={interview.status}
      initialMessages={messages}
    />
  );
}
