import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { LOGO_ACCEPT, logoFileError } from "@/lib/logo-upload";

interface LogoUploadProps {
  companyId: number;
  currentPath?: string | null;
  onUploaded: () => void;
}

interface LogoUploadFormValues {
  logo: File | null;
}

const logoUploadDefaults: LogoUploadFormValues = {
  logo: null,
};

function validateLogoUploadForm(values: LogoUploadFormValues) {
  const error = logoFileError(values.logo);
  if (!error) return undefined;

  return {
    form: "Review the highlighted fields and try again.",
    fields: {
      logo: error,
    },
  };
}

export function LogoUpload({ companyId, currentPath, onUploaded }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: logoUploadDefaults,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: ({ value }) => validateLogoUploadForm(value),
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setUploading(false);
    },
    onSubmit: async ({ value }) => {
      setError(null);
      if (!value.logo) {
        setError("Choose a logo file.");
        setUploading(false);
        return;
      }

      try {
        const formData = new FormData();
        formData.append("logo", value.logo);

        const response = await fetch(`/api/companies/${companyId}/logo`, { method: "POST", body: formData });

        if (!response.ok) {
          setError(await responseError(response, "Failed to upload logo"));
          return;
        }

        onUploaded();
      } finally {
        setUploading(false);
      }
    },
  });

  function submit() {
    setUploading(true);
    void form.handleSubmit().catch(() => setUploading(false));
  }

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <FormErrorBanner error={error} />
      <div className="flex flex-wrap items-center gap-4">
        {currentPath && (
          <img src={`/api/companies/${companyId}/logo`} alt="Logo" className="h-12 w-12 rounded object-contain" />
        )}
        <form.AppField name="logo">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid} className="flex-1">
              <FieldLabel htmlFor={field.name}>Logo file</FieldLabel>
              <Input
                id={field.name}
                type="file"
                accept={LOGO_ACCEPT}
                disabled={uploading}
                aria-invalid={!field.state.meta.isValid}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.files?.[0] ?? null)}
              />
              <FieldError errors={normalizeErrors(field.state.meta.errors)} />
            </Field>
          )}
        </form.AppField>
        <Button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </form>
  );
}
