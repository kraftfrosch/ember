import { NextRequest, NextResponse } from 'next/server';
import { createVoiceClone } from '@/lib/elevenlabs-client';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/voice/clone
 * Creates a voice clone for the authenticated user
 * 
 * Body (multipart/form-data):
 * - audio: File(s) - Audio file(s) for voice cloning
 * - name: string - Name for the voice clone
 * - description?: string - Optional description
 */
export async function POST(request: NextRequest) {
  try {
    // Get authentication token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const audioFiles = formData.getAll('audio') as File[];
    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || undefined;

    // Validation
    if (!audioFiles || audioFiles.length === 0) {
      return NextResponse.json(
        { error: 'Missing audio files' },
        { status: 400 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing voice name' },
        { status: 400 }
      );
    }

    // Create voice clone with ElevenLabs
    const voiceClone = await createVoiceClone({
      name: name.trim(),
      description,
      files: audioFiles,
    });

    // Update user profile with voice_id
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        cloned_voice_id: voiceClone.voice_id,
        voice_cloning_consent: true,
        voice_cloning_consent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile with voice_id:', updateError);
      // Voice clone was created but profile update failed
      // Return success but log the error
    }

    return NextResponse.json({
      success: true,
      voice_id: voiceClone.voice_id,
      voice: voiceClone,
    });
  } catch (error) {
    console.error('Error creating voice clone:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
