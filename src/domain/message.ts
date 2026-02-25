export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export type Message = {
  id: string;
  interviewId: string;
  role: MessageRole;
  content: string;
  hidden: boolean;
  createdAt: Date;
};
