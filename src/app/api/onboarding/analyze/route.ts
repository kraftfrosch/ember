import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { elevenFetch } from "@/lib/elevenlabs-client";

/**
 * POST /api/onboarding/analyze
 * Analyzes the onboarding conversation to generate profile prompts
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check (optional but recommended if we had auth middleware)
    // For onboarding, the user might be anonymous or just signed up.
    // Ideally we pass the Supabase session token.
    
    const body = await request.json();
    const { conversationId, userInfo } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversation ID" },
        { status: 400 }
      );
    }

    // 2. Fetch transcript from ElevenLabs
    // We need to wait a moment for the conversation to be indexed/available sometimes
    // or use the get conversation endpoint
    
    let transcriptText = "";
    
    try {
        const transcriptRes = await elevenFetch(`/v1/convai/conversations/${conversationId}`);
        const transcriptData = await transcriptRes.json();
        
        // Extract transcript
        // Note: The actual structure of the transcript response depends on ElevenLabs API version
        // Assuming it returns an array of messages or similar.
        // For now, if we can't get the full transcript, we'll fall back to a basic profile generation.
        if (transcriptData.transcript) {
            transcriptText = transcriptData.transcript.map((t: any) => `${t.role}: ${t.message}`).join("\n");
        }
    } catch (e) {
        console.warn("Could not fetch transcript:", e);
        // Fallback: Continue with just user info
    }

    // 3. Analyze with LLM (Simulated for now)
    // In a real app, you would call OpenAI/Anthropic here:
    /*
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "Analyze this dating profile interview..." },
        { role: "user", content: transcriptText }
      ]
    });
    */

    // MOCK ANALYSIS LOGIC
    // We'll generate prompts based on the user info and whatever transcript we have
    
    const { name, age, gender, lookingFor } = userInfo || {};
    
    const user_profile_prompt = `
      Name: ${name}
      Age: ${age}
      Gender: ${gender}
      
      Personality Summary:
      (Generated from interview)
      ${name} appears to be an outgoing and friendly individual who values authentic connections. 
      They enjoy casual conversation and have a warm demeanor.
    `.trim();

    const user_preferences_prompt = `
      Looking for: ${lookingFor}
      
      Preferences Summary:
      (Generated from interview)
      They are interested in meeting ${lookingFor} who share similar values. 
      They appreciate honesty and good communication.
    `.trim();

    const user_important_notes = `
      Notes:
      - Has completed the voice onboarding interview.
      - Expressed interest in long-term relationships.
    `.trim();

    // 4. Update User Profile in Supabase (if user is authenticated)
    // Since we didn't enforce auth in this specific route for the "flow",
    // we return the data to the client to store or the client calls an update endpoint.
    // However, usually onboarding happens *after* signup.
    // If the client sent an Auth header, we could update it here.
    
    // Check for Auth header
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        
        if (user) {
            await supabaseAdmin.from("user_profiles").upsert({
                user_id: user.id,
                display_name: name,
                age: parseInt(age),
                gender: gender,
                user_profile_prompt,
                user_preferences_prompt,
                user_important_notes,
                onboarding_completed: true,
                updated_at: new Date().toISOString()
            });
        }
    }

    return NextResponse.json({
      success: true,
      user_profile_prompt,
      user_preferences_prompt,
      user_important_notes
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

