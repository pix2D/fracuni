import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { getCompanyProfile, updateCompanyProfile, upsertCompanyProfile } from "@/lib/companies";
import type { CompanyInput } from "@/lib/companies";
import { resolveDataPath } from "@/lib/data-dir";
import { GET as getLogo, POST as uploadLogo } from "@/pages/api/company/logo";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

afterEach(async () => {
  await fs.rm(resolveDataPath("logos"), { recursive: true, force: true });
});

const COMPANY_INPUT: CompanyInput = {
  name: "Orion Test Works d.o.o.",
  address: "Ilica 1, 10000 Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  taglineHr: null,
  taglineEn: null,
  iban: "HR1234567890123456789",
  swift: "ZABAHR2X",
  legalTextServiceDomesticHr: null,
  legalTextServiceEuB2cHr: null,
  legalTextServiceEuB2cEn: null,
  legalTextServiceEuB2bReverseChargeHr: null,
  legalTextServiceEuB2bReverseChargeEn: null,
  legalTextServiceEuB2bWithoutVatIdHr: null,
  legalTextServiceEuB2bWithoutVatIdEn: null,
  legalTextServiceNonEuB2cHr: null,
  legalTextServiceNonEuB2cEn: null,
  legalTextServiceNonEuB2bHr: null,
  legalTextServiceNonEuB2bEn: null,
  emailFromAddress: "info@orion-test-works.test",
  emailFromName: "Orion Test Works",
  emailSubjectTemplate: null,
  emailBodyTemplate: null,
  defaultPaymentTermsDays: 15,
  issuerName: "Marko Marković",
};

describe("GET /api/company/logo", () => {
  it("serves the Company's stored logo from the data directory", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    await fs.mkdir(resolveDataPath("logos"), { recursive: true });
    await fs.writeFile(resolveDataPath("logos", "company.png"), Buffer.from([1, 2, 3]));
    await updateCompanyProfile({ logoPath: "logos/company.png" });

    const response = await getLogo(apiContext());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it("does not serve paths outside the data directory", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    await updateCompanyProfile({ logoPath: "../outside.png" });

    const response = await getLogo(apiContext());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Logo not found",
    });
  });
});

describe("POST /api/company/logo", () => {
  it("derives the stored logo extension from a whitelisted MIME type", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    const formData = new FormData();
    formData.set("logo", new File([new Uint8Array([1, 2, 3])], "logo.html", { type: "image/png" }));

    const response = await uploadLogo(apiContext({
      request: new Request("http://test.local/api/company/logo", {
        method: "POST",
        body: formData,
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ logoPath: "logos/company.png" });
    await expect(fs.readFile(resolveDataPath("logos", "company.png"))).resolves.toEqual(Buffer.from([1, 2, 3]));
    await expect(getCompanyProfile()).resolves.toMatchObject({ logoPath: "logos/company.png" });
  });

  it("rejects image MIME types outside the logo whitelist", async () => {
    await upsertCompanyProfile(COMPANY_INPUT);
    const formData = new FormData();
    formData.set("logo", new File(["<svg />"], "logo.svg", { type: "image/svg+xml" }));

    const response = await uploadLogo(apiContext({
      request: new Request("http://test.local/api/company/logo", {
        method: "POST",
        body: formData,
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "File must be a PNG, JPEG, or WebP image",
    });
  });
});
