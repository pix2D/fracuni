import type { ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFieldContext } from "@/components/forms/app-form-context";

type FieldErrors = Array<{ message?: string } | undefined>;

export function normalizeErrors(errors: unknown[]): FieldErrors {
  return errors.map((error) => {
    if (typeof error === "string") return { message: error };
    if (error && typeof error === "object" && "message" in error) {
      return { message: String((error as { message?: unknown }).message) };
    }
    return { message: "Invalid value" };
  });
}

interface TextFieldProps {
  label: string;
  type?: "text" | "email";
  placeholder?: string;
  maxLength?: number;
  description?: ReactNode;
}

export function TextField({ label, type = "text", placeholder, maxLength, description }: TextFieldProps) {
  const field = useFieldContext<string | null | undefined>();

  return (
    <Field data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        value={String(field.state.value ?? "")}
        placeholder={placeholder}
        maxLength={maxLength}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={!field.state.meta.isValid}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}

interface NumberFieldProps {
  label: string;
  min?: number;
}

export function NumberField({ label, min }: NumberFieldProps) {
  const field = useFieldContext<number | null | undefined>();

  return (
    <Field data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type="number"
        min={min}
        value={field.state.value != null && Number.isFinite(Number(field.state.value)) ? Number(field.state.value) : ""}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value === "" ? undefined : event.target.valueAsNumber)}
        aria-invalid={!field.state.meta.isValid}
      />
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}

interface SelectFieldProps {
  label: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({ label, placeholder = "Select an option", options }: SelectFieldProps) {
  const field = useFieldContext<string | null | undefined>();

  return (
    <Field data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select value={field.state.value ?? ""} onValueChange={field.handleChange}>
        <SelectTrigger id={field.name} className="w-full" aria-invalid={!field.state.meta.isValid}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}

interface TextareaFieldProps {
  label: string;
  rows?: number;
}

export function TextareaField({ label, rows = 3 }: TextareaFieldProps) {
  const field = useFieldContext<string | null | undefined>();

  return (
    <Field data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        value={String(field.state.value ?? "")}
        rows={rows}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={!field.state.meta.isValid}
      />
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}
