import type { ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  type?: "text" | "email" | "password";
  placeholder?: string;
  maxLength?: number;
  description?: ReactNode;
  disabled?: boolean;
}

export function TextField({ label, type = "text", placeholder, maxLength, description, disabled = false }: TextFieldProps) {
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
        disabled={disabled}
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
  max?: number;
  step?: number;
  description?: ReactNode;
  disabled?: boolean;
}

export function NumberField({ label, min, max, step, description, disabled = false }: NumberFieldProps) {
  const field = useFieldContext<number | null | undefined>();

  return (
    <Field data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={field.state.value != null && Number.isFinite(Number(field.state.value)) ? Number(field.state.value) : ""}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value === "" ? undefined : event.target.valueAsNumber)}
        aria-invalid={!field.state.meta.isValid}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}

interface SelectFieldProps {
  label: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
  description?: ReactNode;
  disabled?: boolean;
}

const EMPTY_SELECT_VALUE = "__empty__";

export function SelectField({
  label,
  placeholder = "Select an option",
  options,
  emptyLabel,
  description,
  disabled = false,
}: SelectFieldProps) {
  const field = useFieldContext<string | null | undefined>();
  const value = field.state.value || (emptyLabel ? EMPTY_SELECT_VALUE : "");

  return (
    <Field data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => field.handleChange(next === EMPTY_SELECT_VALUE ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={field.name} className="w-full" aria-invalid={!field.state.meta.isValid}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {emptyLabel && <SelectItem value={EMPTY_SELECT_VALUE}>{emptyLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}

interface RadioFieldProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  description?: ReactNode;
  disabled?: boolean;
}

export function RadioField({ label, options, description, disabled = false }: RadioFieldProps) {
  const field = useFieldContext<string | null | undefined>();

  return (
    <Field data-invalid={!field.state.meta.isValid}>
      <FieldLabel>{label}</FieldLabel>
      <RadioGroup value={field.state.value ?? ""} onValueChange={field.handleChange} className="flex flex-wrap gap-3" disabled={disabled}>
        {options.map((option) => (
          <Field key={option.value} orientation="horizontal" className="w-auto">
            <RadioGroupItem id={`${field.name}-${option.value}`} value={option.value} />
            <FieldLabel htmlFor={`${field.name}-${option.value}`}>{option.label}</FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}

interface TextareaFieldProps {
  label: string;
  placeholder?: string;
  rows?: number;
  description?: ReactNode;
  disabled?: boolean;
}

export function TextareaField({ label, placeholder, rows = 3, description, disabled = false }: TextareaFieldProps) {
  const field = useFieldContext<string | null | undefined>();

  return (
    <Field data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        value={String(field.state.value ?? "")}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={!field.state.meta.isValid}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={normalizeErrors(field.state.meta.errors)} />
    </Field>
  );
}
