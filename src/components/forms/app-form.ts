import { createFormHook } from "@tanstack/react-form";
import { NumberField, TextareaField, TextField } from "@/components/forms/TanStackFields";
import { fieldContext, formContext } from "@/components/forms/app-form-context";

const fieldComponents = {
  NumberField,
  TextareaField,
  TextField,
};

const formComponents = {};

const appForm = createFormHook({
  fieldComponents,
  formComponents,
  fieldContext,
  formContext,
});

export const { useAppForm, withFieldGroup } = appForm;
