# FireRacuni

Internal invoicing application for a single Croatian issuer company. Generates legally compliant invoices, credit notes, and offers for domestic and international clients.

## Language

### Documents

**Invoice (Račun)**:
A legally binding billing document issued by a Company to a Client. Carries a sequential Document Number.
_Avoid_: Bill, receipt

**Credit Note (Odobrenje)**:
A refund document. Identical structure to an Invoice, shares the same Document Number sequence. Amounts are negative.
_Avoid_: Refund, reversal

**Offer (Ponuda)**:
A non-binding proposal to a Client. Same structure as an Invoice but with its own independent numbering and no legal sequence requirements. Can be converted into an Invoice.
_Avoid_: Quote, estimate, proposal

**Document Number**:
The legally required sequential identifier in the format `{sequence}/{location}/{payment_method}`. Only the sequence increments. The sequence is bound to the Payment Method — each Payment Method maintains its own independent sequence per calendar year.
_Avoid_: Invoice number (when referring to the full formatted number)

### Entities

**Company**:
A singleton legal issuer profile. Has branding, bank details, Locations, Payment Methods, legal texts, and email configuration used on every document.
_Avoid_: Organization, business, issuer

**Client (Kupac)**:
A recipient of documents. A Client is explicitly either a **Business** or a **Person**. Has a free-text address block, country, optional tax identifiers, default document values, and additional tax ID key-value pairs.
_Avoid_: Customer, buyer

**Business Client**:
A legal/entity Client receiving documents in a business capacity. Croatian Business Clients normally have an OIB. Foreign EU Business Clients may have a VAT Number; if provided, VIES Verification is required for reverse charge. Non-EU Business Clients are treated as outside the Croatian/EU VAT scope for the ordinary services this app handles.
_Avoid_: B2B account

**Person Client**:
A natural-person Client receiving documents as a final consumer. Does not participate in VIES/reverse charge. Croatian and EU Person Clients are charged Croatian PDV for the ordinary services this app handles. Non-EU Person Clients are treated as outside the Croatian/EU VAT scope.
_Avoid_: Consumer, buyer

**Location (Mjesto izdavanja)**:
A physical issuing location in the singleton Company profile. Has a number (used in the Document Number) and a multilingual name. Appears as "Mjesto izdavanja" on the document.
_Avoid_: Office, branch

**Payment Method (Način plaćanja)**:
A payment method in the singleton Company profile. Has a number (used in the Document Number) and a multilingual name (e.g. "Virman", "Transakcijski").
_Avoid_: Payment type, payment option

**Service Catalog**:
A global set of reusable line item templates with multilingual descriptions and placeholders (day/month/year). When selected, copies into the Line Item and becomes freely editable.
_Avoid_: Product catalog, service list

**Line Item**:
A single row on a document. Has multilingual descriptions (Croatian/English), quantity (2 decimals), unit price, and amount. Row number is derived from position.
_Avoid_: Item, row, entry

### Tax & Compliance

**OIB**:
Croatian personal/company identification number (11 digits). Required for Croatian Business Clients. Optional for Croatian Person Clients if the issuer chooses to store it.
_Avoid_: Tax ID (ambiguous)

**VAT Number**:
EU VAT identification number. Used for EU Business Clients outside Croatia. Triggers a VIES Verification when present.
_Avoid_: VAT ID, tax number

**VIES Verification**:
A check against the EU VIES service to validate a Business Client's VAT Number. Required for reverse charge invoices. The full response is stored as proof for tax audits. A failed check blocks finalization.
_Avoid_: VAT check, VAT validation

**Reverse Charge**:
Tax mechanism where VAT liability shifts to the buyer. Applies when a foreign EU Business Client has a valid VAT Number confirmed via VIES Verification. No PDV is charged; legal text is shown instead.
_Avoid_: Zero-rate, VAT exempt

**Croatian PDV**:
The standard Croatian VAT charged by the issuing Company. Applies to Croatian Clients, EU Person Clients, and EU Business Clients when no VAT Number is provided. The app currently handles ordinary services only, not special B2C digital-service VAT regimes.
_Avoid_: Domestic-only VAT

**Non-EU Outside Scope**:
Tax treatment for Clients outside the EU. For MVP ordinary services, no Croatian PDV is charged for non-EU Business or Person Clients. This is distinct from EU reverse charge: no VIES Verification is available or required.
_Avoid_: Reverse charge

**Exchange Rate (Tečaj)**:
The HNB (Croatian National Bank) rate captured at Invoice finalization for non-EUR currencies. The latest available rate on or before the invoice date is used. Stored on the Invoice with the effective date.
_Avoid_: FX rate, conversion rate

### Workflow

**Draft**:
An editable, incomplete document. No Document Number assigned. Can be saved at any time without validation.
_Avoid_: New, unsaved

**Finalized**:
A document with a locked Document Number and generated PDF. Editable with audit logging until Sent. PDF is regenerated on edit.
_Avoid_: Issued, confirmed, approved

**Sent**:
An Invoice or Credit Note whose PDF has been emailed to the Client via Postmark. Immutable from this point.
_Avoid_: Delivered, emailed

**Paid**:
An Invoice marked as settled. Terminal state. Records a payment date.
_Avoid_: Settled, closed, completed

## Relationships

- The singleton **Company** profile has many **Locations** and **Payment Methods**
- An **Invoice** uses the singleton **Company** profile and belongs to one **Client**
- A **Credit Note** shares the **Document Number** sequence with **Invoices** (per Payment Method, per year)
- An **Offer** has its own numbering sequence (per year)
- A **Credit Note** may reference the original **Invoice** it refunds
- An **Offer** can be converted into a **Draft** **Invoice**
- A **Line Item** belongs to one document (Invoice, Credit Note, or Offer)
- A **VIES Verification** is stored per Invoice for foreign EU **Business Clients** with a VAT Number

## Example dialogue

> **Dev:** "When a Client places an Offer that gets accepted, does the Invoice keep the same Document Number?"
> **Domain expert:** "No — Offers and Invoices have completely separate numbering. Converting an Offer creates a new Draft Invoice with no number yet. The number is assigned at Finalization."

> **Dev:** "If we issue a Credit Note, does that use the next Invoice number?"
> **Domain expert:** "Yes. Credit Notes and Invoices share one sequence per Payment Method per year. If Invoice 5 was the last document for that Payment Method, the Credit Note is number 6."

> **Dev:** "A Business Client in Germany has a VAT Number. Do we charge PDV?"
> **Domain expert:** "No. We run a VIES Verification first. If it passes, the Invoice is reverse charge — no PDV, just the legal text. If VIES fails, the Invoice stays in Draft."

> **Dev:** "An EU Business Client has no VAT Number. Do we still reverse charge?"
> **Domain expert:** "No. If there is no VAT Number, we charge Croatian PDV. Person Clients never use VIES/reverse charge."

> **Dev:** "What about a Client outside the EU?"
> **Domain expert:** "For the ordinary services this app handles, non-EU Clients are outside scope and no Croatian PDV is charged, regardless of Business or Person type."

## Flagged ambiguities

- "Invoice number" was used to mean both the sequence integer and the full formatted Document Number (e.g. `03/1/1`) — resolved: **Document Number** is the full format, the integer part is just the sequence.
- The original MVP wording tied OIB/VAT mostly to country. Resolved: Client Type (Business vs Person) is explicit and participates in tax treatment.
