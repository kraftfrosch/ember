# API Routes Documentation

## Overview

This document describes the backend API routes for voice cloning and agent creation.

## Environment Variables Required

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
NEXT_PUBLIC_ONBOARDING_AGENT_ID=your_onboarding_agent_id
```

## Authentication

All API routes require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

## Routes

### 1. Clone Voice

**POST** `/api/voice/clone`

Creates a voice clone for the authenticated user using ElevenLabs Instant Voice Cloning.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `audio`: File(s) - One or more audio files for voice cloning (30-60s total recommended)
  - `name`: string - Name for the voice clone
  - `description`: string (optional) - Description of the voice

**Response:**
```json
{
  "success": true,
  "voice_id": "string",
  "voice": { ... }
}
```

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('audio', audioFile1);
formData.append('audio', audioFile2); // Multiple files allowed
formData.append('name', 'My Voice Clone');
formData.append('description', 'Personal voice clone');

const response = await fetch('/api/voice/clone', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
  },
  body: formData,
});

const data = await response.json();
```

**Errors:**
- `401` - Unauthorized (missing/invalid token)
- `400` - Missing audio files or name
- `500` - ElevenLabs API error or server error

---

### 2. Create Agent

**POST** `/api/agent/create`

Creates an ElevenLabs agent for the authenticated user's profile. Requires a voice clone to be created first. The agent prompt is automatically generated from the user's profile data using a template.

**Prerequisites:**
- User profile must have `user_profile_prompt` and `user_preferences_prompt` fields populated
- Voice clone must already be created (`cloned_voice_id` must exist)

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "firstMessage": "string (optional) - First message the agent will say when conversation starts. If not provided, a default message will be generated.",
  "language": "string (optional) - Language code, defaults to 'en'"
}
```

**Response:**
```json
{
  "success": true,
  "agent_id": "string",
  "agent": { ... }
}
```

**Example (JavaScript):**
```javascript
// Minimal request - uses default first message
const response = await fetch('/api/agent/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    language: 'en',
  }),
});

// With custom first message
const response = await fetch('/api/agent/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firstMessage: "Hi! I'm excited to chat with you. What brings you here?",
    language: 'en',
  }),
});

const data = await response.json();
```

**How the Prompt is Generated:**

The agent prompt is automatically generated from three profile fields:
- `user_profile_prompt` - Details about the person, their personality, and dating profile
- `user_preferences_prompt` - What they're looking for in a partner
- `user_important_notes` - Any additional notes or comments for the agent (optional)

These fields are inserted into a template that provides structure and guidelines for the agent's behavior.

**Errors:**
- `401` - Unauthorized (missing/invalid token)
- `404` - User profile not found
- `400` - Voice clone not found, missing required prompt fields (`user_profile_prompt` or `user_preferences_prompt`), or invalid firstMessage
- `500` - ElevenLabs API error or server error

---

## Database Schema

The `user_profiles` table includes:

- **Basic Info**: `display_name`, `age`, `gender`, `location_city`, `location_region`, `bio`, `profile_photo_url`
- **Onboarding Data**: `onboarding_preferences`, `onboarding_questions`, `onboarding_strengths`, `onboarding_summary`, `onboarding_tags`
- **Voice & Agent**: `cloned_voice_id`, `cloned_agent_id`
- **Agent Prompt Fields** (required for agent creation):
  - `user_profile_prompt` - Details about the person, personality, and dating profile
  - `user_preferences_prompt` - What they're looking for in a partner
  - `user_important_notes` - Additional notes/comments for the agent (optional)
- **Consent**: `voice_cloning_consent`, `voice_cloning_consent_at`
- **Status**: `onboarding_completed`, `agent_ready`
- **Timestamps**: `created_at`, `updated_at`

See `src/types/profile.ts` for TypeScript type definitions.
