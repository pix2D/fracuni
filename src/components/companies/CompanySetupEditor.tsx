import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormSection } from "@/components/forms/FormSection";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import { CompanyNumberedSettingSchema } from "@/lib/companies.schema";

interface SettingValue {
  number: number;
  nameHr: string;
  nameEn?: string | null;
  isDefault: boolean;
}

interface CompanySetupValues {
  locations: SettingValue[];
  paymentMethods: SettingValue[];
}

type SettingCollectionName = "locations" | "paymentMethods";

const setupDefaults: CompanySetupValues = {
  locations: [{ number: 1, nameHr: "", nameEn: "", isDefault: true }],
  paymentMethods: [{ number: 1, nameHr: "", nameEn: "", isDefault: true }],
};

export const companySetupFields = {
  locations: "locations",
  paymentMethods: "paymentMethods",
} satisfies { [K in keyof CompanySetupValues]: K };

const settingFieldValidators = {
  number: { onSubmit: CompanyNumberedSettingSchema.shape.number },
  nameHr: { onSubmit: CompanyNumberedSettingSchema.shape.nameHr },
};

function nextNumber(items: SettingValue[]) {
  return Math.max(0, ...items.map((item) => item.number || 0)) + 1;
}

export const CompanySetupEditor = withFieldGroup({
  defaultValues: setupDefaults,
  props: {
    name: "locations" as SettingCollectionName,
    title: "",
    description: "",
    addLabel: "",
  },
  render: function Render({ group, name, title, description, addLabel }) {
    function setItems(items: SettingValue[]) {
      group.setFieldValue(name, items);
    }

    function addItem() {
      const items = group.state.values[name];
      setItems([
        ...items,
        {
          number: nextNumber(items),
          nameHr: "",
          nameEn: "",
          isDefault: items.length === 0,
        },
      ]);
    }

    function removeItem(index: number) {
      const items = group.state.values[name];
      if (items.length <= 1) return;

      const next = items.filter((_, itemIndex) => itemIndex !== index);
      if (!next.some((item) => item.isDefault) && next[0]) {
        next[0] = { ...next[0], isDefault: true };
      }
      setItems(next);
    }

    function setDefault(index: number) {
      setItems(group.state.values[name].map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index })));
    }

    return (
      <FormSection
        title={title}
        description={description}
        action={
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            {addLabel}
          </Button>
        }
      >
        <group.AppField name={name}>
          {(field) => <FieldError errors={normalizeErrors(field.state.meta.errors)} />}
        </group.AppField>

        <group.Subscribe selector={(state) => state.values[name]}>
          {(items) => {
            const defaultIndex = String(Math.max(0, items.findIndex((item) => item.isDefault)));

            return (
              <RadioGroup value={defaultIndex} onValueChange={(value) => setDefault(Number(value))} className="gap-3">
                {items.map((_, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[5rem_1fr_1fr_auto]">
                    <group.AppField name={`${name}[${index}].number`} validators={settingFieldValidators.number}>
                      {(field) => <field.NumberField label="Number" min={1} />}
                    </group.AppField>
                    <group.AppField name={`${name}[${index}].nameHr`} validators={settingFieldValidators.nameHr}>
                      {(field) => <field.TextField label="Name (HR)" />}
                    </group.AppField>
                    <group.AppField name={`${name}[${index}].nameEn`}>
                      {(field) => <field.TextField label="Name (EN)" />}
                    </group.AppField>
                    <div className="flex items-end justify-between gap-3 sm:justify-end">
                      <Field orientation="horizontal" className="w-auto pb-2">
                        <RadioGroupItem id={`${name}-${index}-default`} value={String(index)} />
                        <FieldLabel htmlFor={`${name}-${index}-default`}>Default</FieldLabel>
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={items.length <= 1}
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            );
          }}
        </group.Subscribe>
      </FormSection>
    );
  },
});
