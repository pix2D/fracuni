import { CompanyCreateForm } from "@/components/companies/CompanyCreateForm";
import { CompanyEditForm } from "@/components/companies/CompanyEditForm";
import type { CompanyWithRelations } from "@/lib/companies";

interface Props {
  company?: CompanyWithRelations;
}

export function CompanyForm({ company }: Props) {
  return company ? <CompanyEditForm company={company} /> : <CompanyCreateForm />;
}
