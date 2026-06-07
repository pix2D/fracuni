# Separate PDFs per language instead of dual-language documents

For foreign clients, we generate two separate PDF files: a Croatian version (for internal use and the tax office) and an English version (for the client). The previous approach was a single bilingual document with duplicated tables. Separate files are cleaner — each PDF has one language, one set of labels, one table. The Croatian copy is the legal record; the English copy is a courtesy. Domestic invoices only generate a Croatian PDF.

**Consequence:** Every document template has a language parameter. Foreign invoices produce two files on disk and the email only attaches the English one.
