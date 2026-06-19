import { ClientCreateForm } from "@/components/clients/ClientCreateForm";
import { ClientEditForm } from "@/components/clients/ClientEditForm";
import type { Client } from "@/lib/clients";

interface Props {
  client?: Client;
}

export function ClientForm({ client }: Props) {
  return client ? <ClientEditForm client={client} /> : <ClientCreateForm />;
}
