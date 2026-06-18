import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";

interface LogoUploadProps {
  companyId: number;
  currentPath?: string | null;
  onUploaded: () => void;
}

export function LogoUpload({ companyId, currentPath, onUploaded }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("logo", file);

    const response = await fetch(`/api/companies/${companyId}/logo`, { method: "POST", body: formData });
    setUploading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Failed to upload logo");
      return;
    }

    onUploaded();
  }

  return (
    <div className="space-y-3">
      <FormErrorBanner error={error} />
      <div className="flex flex-wrap items-center gap-4">
        {currentPath && (
          <img src={`/api/companies/${companyId}/logo`} alt="Logo" className="h-12 w-12 rounded object-contain" />
        )}
        <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} disabled={uploading} />
      </div>
    </div>
  );
}
