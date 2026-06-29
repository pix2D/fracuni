import { getDb } from "@/lib/db";
import { DOCUMENT_TYPE, INVOICE_STATUS } from "@/lib/documents";
import { invalidOperation, invalidRequest, notFound } from "@/lib/app-errors";

export interface DocumentNumberSequenceState {
  companyId: number;
  year: number;
  paymentMethodId: number;
  paymentMethodNumber: number;
  paymentMethodNameHr: string;
  paymentMethodNameEn: string | null;
  lastValue: number;
  nextSequence: number;
  maxIssuedSequence: number;
}

function parseSequence(documentNumber: string): number | null {
  const [raw] = documentNumber.split("/", 1);
  const sequence = Number(raw);
  return Number.isInteger(sequence) && sequence > 0 ? sequence : null;
}

async function assertCompanyExists(companyId: number): Promise<void> {
  const company = await getDb()
    .selectFrom("companies")
    .select("id")
    .where("id", "=", companyId)
    .executeTakeFirst();

  if (!company) throw notFound("Company not found");
}

async function issuedSequenceMaximums(
  companyId: number,
  year: number,
): Promise<Map<number, number>> {
  const rows = await getDb()
    .selectFrom("invoices")
    .select(["paymentMethodId", "documentNumber"])
    .where("companyId", "=", companyId)
    .where("issueDate", ">=", `${year}-01-01`)
    .where("issueDate", "<", `${year + 1}-01-01`)
    .where("status", "!=", INVOICE_STATUS.DRAFT)
    .where("type", "in", [DOCUMENT_TYPE.INVOICE, DOCUMENT_TYPE.CREDIT_NOTE])
    .where("paymentMethodId", "is not", null)
    .where("documentNumber", "is not", null)
    .execute();

  const maximums = new Map<number, number>();
  for (const row of rows) {
    const sequence = parseSequence(row.documentNumber!);
    if (sequence == null || row.paymentMethodId == null) continue;
    maximums.set(row.paymentMethodId, Math.max(maximums.get(row.paymentMethodId) ?? 0, sequence));
  }
  return maximums;
}

export async function listDocumentNumberSequences(
  companyId: number,
  year: number,
): Promise<DocumentNumberSequenceState[]> {
  await assertCompanyExists(companyId);

  const db = getDb();
  const [paymentMethods, sequences, issuedMaximums] = await Promise.all([
    db
      .selectFrom("paymentMethods")
      .select(["id", "number", "nameHr", "nameEn"])
      .where("companyId", "=", companyId)
      .orderBy("number")
      .execute(),
    db
      .selectFrom("documentNumberSequences")
      .select(["paymentMethodId", "lastValue"])
      .where("companyId", "=", companyId)
      .where("year", "=", year)
      .execute(),
    issuedSequenceMaximums(companyId, year),
  ]);

  const sequenceByPaymentMethod = new Map(
    sequences.map((sequence) => [sequence.paymentMethodId, sequence.lastValue]),
  );

  return paymentMethods.map((paymentMethod) => {
    const lastValue = sequenceByPaymentMethod.get(paymentMethod.id!) ?? 0;
    return {
      companyId,
      year,
      paymentMethodId: paymentMethod.id!,
      paymentMethodNumber: paymentMethod.number,
      paymentMethodNameHr: paymentMethod.nameHr,
      paymentMethodNameEn: paymentMethod.nameEn,
      lastValue,
      nextSequence: lastValue + 1,
      maxIssuedSequence: issuedMaximums.get(paymentMethod.id!) ?? 0,
    };
  });
}

export async function setDocumentNumberNextSequence(
  companyId: number,
  year: number,
  paymentMethodId: number,
  nextSequence: number,
): Promise<DocumentNumberSequenceState> {
  if (!Number.isInteger(nextSequence) || nextSequence <= 0) {
    throw invalidRequest("Next sequence must be a positive whole number");
  }

  await assertCompanyExists(companyId);

  const db = getDb();
  const paymentMethod = await db
    .selectFrom("paymentMethods")
    .select(["id", "companyId"])
    .where("id", "=", paymentMethodId)
    .executeTakeFirst();

  if (!paymentMethod || paymentMethod.companyId !== companyId) {
    throw notFound("Payment method not found");
  }

  const issuedMaximum = (await issuedSequenceMaximums(companyId, year)).get(paymentMethodId) ?? 0;
  if (nextSequence <= issuedMaximum) {
    throw invalidOperation(
      `Next sequence must be greater than the locally issued sequence ${issuedMaximum}`,
    );
  }

  const lastValue = nextSequence - 1;
  await db
    .insertInto("documentNumberSequences")
    .values({ companyId, year, paymentMethodId, lastValue })
    .onConflict((oc) =>
      oc
        .columns(["companyId", "year", "paymentMethodId"])
        .doUpdateSet({ lastValue }),
    )
    .execute();

  const state = (await listDocumentNumberSequences(companyId, year)).find(
    (sequence) => sequence.paymentMethodId === paymentMethodId,
  );
  if (!state) throw notFound("Payment method not found");
  return state;
}
