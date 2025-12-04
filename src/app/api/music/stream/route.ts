import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase";

const MUSIC_DURATION_MS = 30_000;

const musicPromptSchema = z.object({
  music_prompt: z
    .string()
    .describe(
      "A vivid, production-ready prompt for a music generation model. Mention genre, instrumentation, tempo (in BPM), mood, and any notable transitions."
    ),
});

const systemPrompt = `
You are an award-winning music director crafting detailed briefs for a generative music model.
- Produce a single paragraph prompt (max ~80 words).
- Reference concrete instrumentation, rhythmic feel, texture, and emotional arc.
- Specify tempo in BPM or relative pacing (e.g. "slow 70 BPM ballad").
- Keep the tone positive and aligned with the described personality.
Return only the prompt text without markdown.
`;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized request" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_profile_prompt")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    if (!profile.user_profile_prompt) {
      return NextResponse.json(
        {
          error:
            "Missing profile data. Complete onboarding to unlock music generation.",
        },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Missing Google Generative AI credentials" },
        { status: 500 }
      );
    }

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: musicPromptSchema,
      system: systemPrompt,
      prompt: `User profile description:\n${profile.user_profile_prompt}\n\nWrite a single prompt for a 30-second instrumental track that reflects this person.`,
    });

    const prompt = object.music_prompt.trim();

    if (!prompt) {
      return NextResponse.json(
        { error: "Failed to generate music prompt" },
        { status: 500 }
      );
    }

    const elevenApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenApiKey) {
      return NextResponse.json(
        { error: "Missing ElevenLabs API key" },
        { status: 500 }
      );
    }

    const elevenlabs = new ElevenLabsClient({ apiKey: elevenApiKey });
    const stream = await elevenlabs.music.stream({
      prompt,
      musicLengthMs: MUSIC_DURATION_MS,
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Music stream error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate music stream",
      },
      { status: 500 }
    );
  }
}
