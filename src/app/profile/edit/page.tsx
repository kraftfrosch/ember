"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, MapPin, Loader2, Check, X } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase-client";
import { toast } from "sonner";
import { Logo } from "@/components/logo";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        setUserId(user.id);

        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("display_name, location_city, location_region, profile_photo_url")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error loading profile:", error);
          toast.error("Failed to load profile");
          return;
        }

        if (profile) {
          setDisplayName(profile.display_name || "");
          setCity(profile.location_city || "");
          setRegion(profile.location_region || "");
          setProfilePhotoUrl(profile.profile_photo_url || null);
          setPreviewUrl(profile.profile_photo_url || null);
        }
      } catch (err) {
        console.error("Error:", err);
        toast.error("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload photo");
        setPreviewUrl(profilePhotoUrl);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);

      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`; // Cache bust
      setProfilePhotoUrl(newUrl);
      setPreviewUrl(newUrl);
      toast.success("Photo uploaded!");
    } catch (err) {
      console.error("Error uploading:", err);
      toast.error("Failed to upload photo");
      setPreviewUrl(profilePhotoUrl);
    } finally {
      setUploading(false);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          location_city: city.trim() || null,
          location_region: region.trim() || null,
          profile_photo_url: profilePhotoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("Save error:", error);
        toast.error("Failed to save profile");
        return;
      }

      toast.success("Profile updated!");
      router.push("/feed");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // Remove photo
  const handleRemovePhoto = async () => {
    if (!userId || !profilePhotoUrl) return;

    try {
      // Delete from storage
      const fileName = `${userId}/profile.${profilePhotoUrl.split(".").pop()?.split("?")[0]}`;
      await supabase.storage.from("profile-photos").remove([fileName]);

      // Update profile
      await supabase
        .from("user_profiles")
        .update({ profile_photo_url: null })
        .eq("user_id", userId);

      setProfilePhotoUrl(null);
      setPreviewUrl(null);
      toast.success("Photo removed");
    } catch (err) {
      console.error("Error removing photo:", err);
      toast.error("Failed to remove photo");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md px-4 py-4 sticky top-0 z-50 flex items-center gap-4 border-b border-border/40">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Edit Profile</h1>
      </header>

      <main className="p-6 max-w-md mx-auto space-y-8">
        {/* Profile Photo Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-secondary overflow-hidden border-4 border-border">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <span className="text-4xl font-bold text-foreground/30">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Camera button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Remove photo button */}
            {previewUrl && (
              <button
                onClick={handleRemovePhoto}
                className="absolute top-0 right-0 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-sm text-muted-foreground mt-3 text-center">
            Your photo is only visible to your matches
          </p>
        </motion.div>

        {/* Location Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Location
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., San Francisco"
                className="w-full px-4 py-3 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                State / Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., California"
                className="w-full px-4 py-3 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

