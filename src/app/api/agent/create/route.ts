import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/elevenlabs-client";
import { supabaseAdmin } from "@/lib/supabase";
import {
  generateAgentPrompt,
  generateDefaultFirstMessage,
} from "@/lib/agent-prompt-template";

/**
 * POST /api/agent/create
 * Creates an agent for the authenticated user's profile
 *
 * Body (JSON):
 * {
 *   "firstMessage"?: string - First message the agent will say (optional, will use default if not provided)
 *   "language"?: string - Language code (default: "en")
 * }
 *
 * The prompt is automatically generated from the user's profile data:
 * - user_profile_prompt
 * - user_preferences_prompt
 * - user_important_notes
 */
export async function POST(request: NextRequest) {
  try {
    // Get authentication token from header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify user with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    // Get user profile with all required fields for prompt generation
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select(
        "cloned_voice_id, display_name, user_profile_prompt, user_preferences_prompt, user_important_notes"
      )
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "User profile not found. Please complete profile setup first.",
        },
        { status: 404 }
      );
    }

    if (!profile.cloned_voice_id) {
      return NextResponse.json(
        { error: "Voice clone not found. Please create a voice clone first." },
        { status: 400 }
      );
    }

    // Validate required prompt fields
    if (
      !profile.user_profile_prompt ||
      profile.user_profile_prompt.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "User profile prompt is required. Please complete your profile setup.",
        },
        { status: 400 }
      );
    }

    if (
      !profile.user_preferences_prompt ||
      profile.user_preferences_prompt.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "User preferences prompt is required. Please complete your profile setup.",
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { firstMessage, language } = body;

    // Generate prompt from template
    let prompt: string;
    try {
      prompt = generateAgentPrompt({
        user_profile_prompt: profile.user_profile_prompt,
        user_preferences_prompt: profile.user_preferences_prompt,
        user_important_notes: profile.user_important_notes || undefined,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate agent prompt",
        },
        { status: 400 }
      );
    }

    // Use provided firstMessage or generate default
    const agentFirstMessage =
      firstMessage && typeof firstMessage === "string"
        ? firstMessage.trim()
        : generateDefaultFirstMessage(profile.display_name);

    if (agentFirstMessage.length === 0) {
      return NextResponse.json(
        { error: "First message cannot be empty" },
        { status: 400 }
      );
    }

    // Create agent name from user's display name
    const agentName = `${profile.display_name}'s Agent`;

    // Create agent with ElevenLabs
    const agent = await createAgent({
      name: agentName,
      voiceId: profile.cloned_voice_id,
      prompt,
      firstMessage: agentFirstMessage,
      language: language || "en",
    });

    // Extract agent_id from response
    const agentId = agent.agent_id || (agent as unknown as { id?: string }).id;

    if (!agentId) {
      console.error("Agent created but no agent_id in response:", agent);
      return NextResponse.json(
        { error: "Agent created but failed to retrieve agent ID" },
        { status: 500 }
      );
    }

    // Update user profile with agent_id
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        cloned_agent_id: agentId,
        agent_ready: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating profile with agent_id:", updateError);
      // Agent was created but profile update failed
      // Return success but log the error
    }

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      agent: agent,
    });
  } catch (error) {
    console.error("Error creating agent:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
