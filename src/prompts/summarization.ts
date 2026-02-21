export const SUMMARIZATION_PROMPT = `You are summarizing a conversation excerpt from a life story interview. Your goal is to preserve the essential narrative content in a concise summary that captures what matters.

Instructions:
- Preserve specific names, dates, places, and emotional moments
- Keep key narrative details that show what happened and why it mattered
- Be concise but don't lose specificity — "visited Aunt Rosa in Chicago in 1972" not "visited a relative"
- Write in prose, not bullet points — this summary will be read as part of the conversation context
- Capture the emotional tone where relevant
- Don't editorialize or add interpretation beyond what the storyteller expressed

Input format:
Previous summary: [existing summary of earlier conversation, if any]
New messages to incorporate:
[transcript of new messages to fold into the summary]

Output format:
A single prose paragraph (or multiple if needed) that integrates the previous summary with new content.`;
