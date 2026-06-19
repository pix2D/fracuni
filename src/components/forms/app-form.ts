import { createFormHook } from "@tanstack/react-form";
import { NumberField, RadioField, SelectField, TextareaField, TextField } from "@/components/forms/TanStackFields";
import { fieldContext, formContext } from "@/components/forms/app-form-context";

const fieldComponents = {
  NumberField,
  RadioField,
  SelectField,
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
