import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are TeamFlow AI, a helpful project management assistant. You help users manage tasks, track deadlines, and stay productive. Be concise, friendly, and actionable. Respond in the user's language (French or English).

When asked about tasks, projects, or deadlines, provide specific, actionable information based on the workspace context provided by the user. If you don't have exact data, give helpful general advice. Keep responses under 3 paragraphs unless the user asks for detail.`;

const SUGGESTIONS_PROMPT = `You are TeamFlow AI, a smart productivity assistant for a project management app. Generate 5 actionable productivity suggestions for the user based on their workspace context.

Return a JSON array of 5 suggestion objects. Each object must have:
- id: a unique string (e.g., "sug-1")
- icon: an emoji icon for the suggestion
- title: a short title (max 40 chars)
- description: a brief description (max 80 chars)
- action: the action button label (max 20 chars)
- actionType: one of "create_task", "view_project", "schedule_meeting", "review_task", "check_deadline"

Example format:
[{"id":"sug-1","icon":"⏰","title":"Review overdue tasks","description":"2 tasks are past their due date and need attention","action":"Review now","actionType":"review_task"}]

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, mode } = body as { message?: string; context?: string; mode?: string };

    if (mode === 'suggestions') {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default;
        const zai = await ZAI.create();
        const messages: Array<{ role: 'system' | 'user'; content: string }> = [
          { role: 'system', content: SUGGESTIONS_PROMPT },
        ];
        if (context) {
          messages.push({ role: 'user', content: `Workspace context:\n${context}` });
        }

        const response = await zai.chat.completions.create({
          messages,
          thinking: { type: 'disabled' },
        });

        const aiContent = response.choices?.[0]?.message?.content;
        if (aiContent) {
          try {
            const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const suggestions = JSON.parse(cleanContent);
            if (Array.isArray(suggestions) && suggestions.length > 0) {
              return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
            }
          } catch {
            // AI didn't return valid JSON
          }
        }
      } catch {
        // AI call failed
      }
      return NextResponse.json({ suggestions: [] });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    if (context) {
      messages.push({ role: 'user', content: `[Context]: ${context}` });
      messages.push({ role: 'assistant', content: 'Got it, I have the context. How can I help?' });
    }

    messages.push({ role: 'user', content: message.trim() });

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const response = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    });

    const aiContent = response.choices?.[0]?.message?.content;

    if (!aiContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: aiContent });
  } catch (error) {
    console.error('AI Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get AI response',
        fallback: "I'm having trouble connecting right now. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
