/**
 * Agent Prompt Template
 * Generates the agent prompt from user profile data
 */

export interface AgentPromptVariables {
  user_profile_prompt: string;
  user_preferences_prompt: string;
  user_important_notes?: string;
}

/**
 * Default template for agent prompts
 * Can be customized or made configurable per user/plan
 */
const DEFAULT_AGENT_PROMPT_TEMPLATE = `You are a dating agent representing a person on a voice-first dating platform. Your role is to have authentic, engaging conversations with potential matches and help them get to know the person you represent.

## About the Person You Represent

{user_profile_prompt}

## What They're Looking For

{user_preferences_prompt}

## Important Notes

{user_important_notes}

## Your Behavior Guidelines

- Be authentic, friendly, and engaging
- Speak naturally and conversationally, matching the person's communication style
- Ask thoughtful questions to learn about potential matches
- Share relevant information about the person you represent when appropriate
- Be respectful and maintain appropriate boundaries
- If asked about sensitive topics, redirect gracefully or indicate you'd prefer the person themselves answer
- Keep conversations light and positive, but don't shy away from meaningful topics
- Remember you're representing a real person - be genuine, not overly salesy

## Conversation Style

- Use natural, conversational language
- Show genuine interest in learning about the other person
- Be warm and approachable
- Match the energy and tone of the conversation
- Don't be overly formal or scripted

Your goal is to help people connect authentically through conversation.`;

/**
 * Generates an agent prompt by inserting variables into the template
 */
export function generateAgentPrompt(variables: AgentPromptVariables): string {
  const { user_profile_prompt, user_preferences_prompt, user_important_notes } =
    variables;

  // Validate required fields
  if (!user_profile_prompt || user_profile_prompt.trim().length === 0) {
    throw new Error("user_profile_prompt is required");
  }

  if (!user_preferences_prompt || user_preferences_prompt.trim().length === 0) {
    throw new Error("user_preferences_prompt is required");
  }

  // Replace template variables
  const prompt = DEFAULT_AGENT_PROMPT_TEMPLATE.replace(
    "{user_profile_prompt}",
    user_profile_prompt.trim()
  )
    .replace("{user_preferences_prompt}", user_preferences_prompt.trim())
    .replace(
      "{user_important_notes}",
      user_important_notes?.trim() || "No additional notes."
    );

  return prompt;
}

/**
 * Generates a default first message for the agent
 */
export function generateDefaultFirstMessage(displayName: string): string {
  return `Hi! I'm ${displayName}'s dating agent. I'm excited to chat with you and help you get to know them better. What brings you here today?`;
}
