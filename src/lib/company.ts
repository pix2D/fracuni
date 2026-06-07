import { listCompanies } from "@/lib/companies";

export async function getCompanies() {
  return listCompanies();
}
