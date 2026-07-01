export const CLIENT_TYPE = {
  BUSINESS: "business",
  PERSON: "person",
} as const;

export type ClientType = (typeof CLIENT_TYPE)[keyof typeof CLIENT_TYPE];

export function isClientType(value: string): value is ClientType {
  return value === CLIENT_TYPE.BUSINESS || value === CLIENT_TYPE.PERSON;
}

export function parseClientType(value: string): ClientType {
  if (isClientType(value)) return value;
  throw new Error(`Invalid client type: ${value}`);
}

export function clientTypeLabel(type: ClientType): string {
  return type === CLIENT_TYPE.BUSINESS ? "B2B" : "B2C";
}
