import { useState, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Upload, Camera, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/app/lib/queryClient";
import { useToast } from "@/app/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";

interface UserPhotoUploadProps {
  userId: string;
  currentPhoto?: string | null;
  customPhoto?: string | null;
  userName: string;
  canEdit?: boolean;
}

export function UserPhotoUpload({ 
  userId, 
  currentPhoto, 
  customPhoto, 
  userName, 
  canEdit = true 
}: UserPhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Display the custom photo if available, otherwise fall back to profile image
  const displayPhoto = customPhoto || currentPhoto;

  const uploadPhotoMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/photo`, {
        customProfileImage: base64Image,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
      setIsDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile photo",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image file must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!selectedFile || !previewUrl) return;

    // Convert to base64 and upload
    uploadPhotoMutation.mutate(previewUrl);
  };

  const handleRemovePhoto = () => {
    uploadPhotoMutation.mutate("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!canEdit) {
    return (
      <Avatar className="h-12 w-12">
        <AvatarImage src={displayPhoto || undefined} alt={userName} />
        <AvatarFallback className="bg-blue-100 text-blue-600">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-12 w-12">
        <AvatarImage src={displayPhoto || undefined} alt={userName} />
        <AvatarFallback className="bg-blue-100 text-blue-600">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Change Photo
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Update Profile Photo</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Current Photo Preview */}
            <div className="flex justify-center">
              <Avatar className="h-32 w-32">
                <AvatarImage 
                  src={previewUrl || displayPhoto || undefined} 
                  alt={userName} 
                />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Choose New Photo
              </Button>

              <p className="text-sm text-gray-500 text-center">
                Supported formats: JPG, PNG, GIF (max 5MB)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {selectedFile && (
                <Button
                  onClick={handleUpload}
                  disabled={uploadPhotoMutation.isPending}
                  className="w-full"
                >
                  {uploadPhotoMutation.isPending ? "Uploading..." : "Update Photo"}
                </Button>
              )}

              {(displayPhoto || customPhoto) && (
                <Button
                  variant="outline"
                  onClick={handleRemovePhoto}
                  disabled={uploadPhotoMutation.isPending}
                  className="w-full flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  Remove Photo
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}