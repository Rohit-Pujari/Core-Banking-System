# Chen ER diagrams

Open [index.html](index.html) for the complete gallery.

- [Complete Chen ER](01-er-diagram.svg): all eight entities and their attributes.
- [Banking detail](06-chen-banking.svg): customers, branches, accounts, transfers and audits.
- [Login and loan detail](07-chen-access-loans.svg): users, sessions and loans.
- [Relationships only](08-chen-relationships.svg): easier overview without attributes.
- [Notation key](09-chen-notation.svg): symbols and their meaning.
- [Relational schema](10-relational-schema.svg): the separate SQL table/foreign-key view.

## How to read the Chen diagrams

Rectangles are entities, diamonds are relationships, ovals are attributes, and underlined attributes are primary keys. Lines have no arrows. Min/max labels on each entity's relationship line give its participation: `(0,N)` optional many, `(1,1)` exactly one, `(0,1)` optional one. Minimum 1 expresses total participation; this diagram uses min/max notation instead of also drawing double participation lines.

KYC is a composite conceptual attribute with verified, occupation and risk components, stored together in MySQL JSON. Those components describe the application document, not separately constrained SQL columns. EMI is derived from principal, rate and term, so its oval is dashed. Account balance is stored, so it is not shown as derived.

The conceptual key labels customer_id, branch_id, account_id, transfer_id, audit_id, loan_id and user_id map to the respective table's `id` column. Session token_hash uses its actual column name. Foreign-key columns are expressed through relationships in Chen notation; see the relational schema for the actual columns.

Has login is optional on both ends overall: a customer profile can have at most one user; a customer-role user must have one profile, while employee/admin users have none. Reviews has an optional reviewer; the API enforces that reviewers are admins. Parent of is recursive, with separately labeled parent and child roles.

## Symbols that are not used by this schema

A double oval means multivalued. Customer phone is currently one text value, so it is a single oval. A double rectangle means weak entity and a double diamond its identifying relationship. A weak entity depends on its owner's key plus a partial key (dashed underline).

Our entities have independent primary keys, including sessions and audit rows. A foreign key or cascade deletion alone does not make an entity weak. Therefore the actual ER diagram has no weak entities or multivalued attributes. The notation key shows these symbols as examples only. “Weak attribute” usually refers to a weak entity's partial key.

## Regenerate

Run `python3 diagrams/generate.py` (requires Graphviz). `chen.py` defines the Chen entities and relationships; `.dot` files are editable diagram sources. SVG files work offline and can be printed to PDF from the browser.
