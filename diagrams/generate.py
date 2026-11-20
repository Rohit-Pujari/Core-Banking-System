"""Regenerate presentation diagrams: python3 diagrams/generate.py (requires Graphviz)."""
from pathlib import Path
import subprocess, html
root=Path(__file__).resolve().parent
base='''digraph G { graph [rankdir=LR, bgcolor="#ffffff", pad="0.5", nodesep="0.55", ranksep="1.0", fontname="DejaVu Sans", fontsize=18]; node [shape=box, style="rounded,filled", fillcolor="#edf5ef", color="#a8c4b0", fontname="DejaVu Sans", fontsize=12, margin="0.2,0.15"]; edge [color="#597766", fontname="DejaVu Sans", fontsize=10, arrowsize=0.8];\n'''
def save(name,body):
    source=root/(name+'.dot');source.write_text(base+body+'\n}')
    for fmt in ['svg']:
        subprocess.run(['dot','-T'+fmt,str(source),'-o',str(root/(name+'.'+fmt))],check=True)
def entity(name,fields):
    rows=''.join('<TR><TD ALIGN="LEFT">'+html.escape(f)+'</TD></TR>' for f in fields.split('|'))
    return f'{name} [shape=plain, label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="7"><TR><TD BGCOLOR="#16583e"><FONT COLOR="white"><B>{name}</B></FONT></TD></TR>{rows}</TABLE>>];\n'
tables={
'branches':'PK id : integer|name : text|city : text|FK parent_id : integer (nullable)',
'customers':'PK id : integer|name : text|UK email : text|phone : text|kyc : jsonb|created_at : timestamptz',
'accounts':'PK id : integer|UK number : text|FK customer_id : integer|FK branch_id : integer|kind : Savings / Current|balance : numeric(16,2), >= 0|status : Active / Frozen / Closed',
 'transfers':'PK id : integer|FK from_account : integer|FK to_account : integer|amount : numeric(16,2), > 0|narration : text|created_at : timestamptz',
'audit_log':'PK id : integer|FK account_id : integer|old_balance : numeric(16,2)|new_balance : numeric(16,2)|actor : text (database user)|created_at : timestamptz',
'loans':'PK id : integer|FK customer_id : integer|kind : text|principal : numeric(16,2)|rate : numeric(5,2)|months : integer|status : Active / Pending / Closed / Rejected|FK reviewed_by : integer (nullable)|reviewed_at : timestamptz (nullable)',
'app_users':'PK id : integer|name : text|UK email : text|password_hash : text|role : customer / employee / admin|FK, UK customer_id : integer (nullable)',
'app_sessions':'PK token_hash : text|FK user_id : integer (delete cascade)|expires_at : timestamptz|created_at : timestamptz'}
edges=[('branches','branches','parent_id','0..1','0..*'),('branches','accounts','branch_id','1','0..*'),('customers','accounts','customer_id','1','0..*'),('customers','loans','customer_id','1','0..*'),('accounts','transfers','from_account','1','0..*'),('accounts','transfers','to_account','1','0..*'),('accounts','audit_log','account_id','1','0..*'),('customers','app_users','customer_id','0..1','0..1'),('app_users','loans','reviewed_by','0..1','0..*'),('app_users','app_sessions','user_id','1','0..*')]
body='graph [label="Vault — Relational schema", labelloc=t];\n'+''.join(entity(n,f) for n,f in tables.items())
for a,b,label,tail,head in edges:body+=f'{a} -> {b} [label="{label}", taillabel="{tail}", headlabel="{head}", labeldistance=2];\n'
body+='legend [fillcolor="#fff5df", label="PK = primary key | FK = foreign key | UK = unique\\nEdges point from referenced table to referencing table.\\nMultiplicity at each end: 1 = exactly one; 0..1 = optional; 0..* = zero or more.\\nCustomer logins require customer_id; employee/admin logins have no customer_id.\\nEight application tables; schema_version is an internal migration tracker."];'
save('10-relational-schema',body)
save('02-architecture','''graph [label="Vault — Application architecture", labelloc=t];
customer [label="Customer portal\nAccounts • Payments • Loans • Profile"];
staff [label="Employee / admin portal\nCustomer servicing • Account management\nLoan decisions • Audit • Reports"];
next [label="Next.js App Router\nReact interface + Node.js route handlers"];
auth [label="Authentication and authorization\nSession lookup • Role checks • Account ownership\nOrigin validation • Login throttling"];
service [label="Banking operations\nParameterized SQL + database transactions"];
pg [label="PostgreSQL\nTables • Constraints • Functions • Audit trigger"];
embedded [label="Default: PGlite\nPersistent data/bank", fillcolor="#eef1fb"];
server [label="Optional: PostgreSQL container\nDATABASE_URL • psql CLI", fillcolor="#eef1fb"];
mongo [label="MongoDB container\nIndependent KYC and knowledge documents\nCLI demo only; not connected to app data", fillcolor="#fff5df"];
cli [label="Presentation terminal\npsql / mongosh"];
customer -> next; staff -> next; next -> auth; auth -> service; service -> pg;
pg -> embedded [label="one runtime option",style=dashed]; pg -> server [label="one runtime option",style=dashed];
cli -> server [label="SQL / privileges"]; cli -> mongo [label="document queries"];
''')
save('03-transfer-flow','''graph [rankdir=TB,label="Vault — Internal transfer transaction",labelloc=t];
start [label="Enter source account, recipient number and amount"];
auth [label="Verify session and request origin\nValidate amount and account identifiers"];
begin [label="BEGIN transaction"];
owner [label="Check source ownership for customers\nResolve recipient account number"];
func [label="transfer_funds(source, destination, amount, note)"];
lock [label="Validate amount and distinct accounts\nLock both accounts in ascending ID order\nCheck active status and available balance"];
update [label="Debit source and credit destination"];
trigger [label="balance_audit AFTER UPDATE trigger\nInsert old/new balances for each changed account"];
insert [label="Insert transfer record"];

commit [label="COMMIT\nReturn transfer reference and refresh balances"];
fail [label="Reject invalid request\nROLLBACK if a transaction has started",fillcolor="#fcece7"];
start -> auth -> begin -> owner -> func -> lock -> update -> trigger -> insert -> commit;
auth -> fail [label="unauthenticated / invalid",style=dashed];owner -> fail [label="not owned / missing",style=dashed];lock -> fail [label="frozen / insufficient funds",style=dashed];update -> fail [label="database error",style=dashed];
''')
save('04-role-permissions','''graph [label="Vault — Application roles",labelloc=t];
c [label="Customer"]; e [label="Employee"]; a [label="Administrator"];
personal [label="Own accounts, balances and transfers\nSend from owned accounts\nApply for loans • View own KYC"];
operations [label="Onboard customers • Verify KYC\nOpen accounts • Freeze / reactivate\nAssist with internal transfers\nView bank records and loan applications"];
oversight [label="Approve / reject pending loans\nCreate employee logins\nView balance audit\nRun banking reports"];
note [label="Permissions enforced by API session and role checks.\nDatabase CLI auditor/teller roles are a separate demonstration.",fillcolor="#fff5df"];
c -> personal;e -> operations;a -> operations;a -> oversight;
''')
save('05-customer-loan-flow','''graph [rankdir=TB,label="Vault — Onboarding and loan review",labelloc=t];
register [label="Customer registers / employee creates customer login"];
kyc [label="Customer profile: KYC pending"];
verify [label="Employee or admin verifies KYC"];
account [label="Employee or admin opens account\nStarting balance = 0"];
use [label="Customer views account and receives transfers"];
apply [label="Signed-in customer submits loan application\nProduct • Amount • Term"];
validate [label="Server validates input and assigns product rate\nLoan status = Pending"];
review [label="Administrator reviews application"];
approve [label="Approve: status = Active\nRecord reviewer and review time"];
reject [label="Reject: status = Rejected\nRecord reviewer and review time"];
view [label="Customer sees decision and calculated EMI\nNo automatic disbursement or repayment collection",fillcolor="#fff5df"];
register -> kyc -> verify -> account -> use;
register -> apply [label="loan application does not require an open account",style=dashed];apply -> validate -> review;review -> approve;review -> reject;approve -> view;reject -> view;
''')
items=[('01-er-diagram','Chen ER diagram','Entities, relationships, attribute ovals and min/max participation.'),('06-chen-banking','Banking ER detail','Accounts, transfers, branches and automatic balance audit.'),('07-chen-access-loans','Login and loan ER detail','Customer profiles, users, sessions and loan review.'),('08-chen-relationships','Relationship overview','All relationships without the attribute ovals, for readability.'),('09-chen-notation','Notation key','Meaning of each symbol; weak and multivalued examples are illustrative only.'),('10-relational-schema','Relational schema','SQL tables and columns, including foreign keys.'),('02-architecture','System architecture','Next.js, authorization, PostgreSQL runtime options and the separate MongoDB demo.'),('03-transfer-flow','Transfer processing','Validation, locking, balance updates, trigger audit and commit/rollback.'),('04-role-permissions','User permissions','Customer, employee and administrator responsibilities.'),('05-customer-loan-flow','Customer onboarding and loans','KYC, account opening, application submission and admin review.')]
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vault — Project diagrams</title><style>body{font:16px system-ui;margin:0;background:#f3f6f3;color:#213b2c}header,main{max-width:1400px;margin:auto;padding:28px}h1{margin:0}nav{display:flex;gap:18px;flex-wrap:wrap;margin-top:20px}a{color:#17613e}section{background:white;padding:24px;margin-bottom:28px;border:1px solid #dce6dc;border-radius:10px}img{width:100%;max-height:850px;object-fit:contain}p{color:#536856;line-height:1.6}.links{display:flex;gap:18px}@media print{header nav,.links{display:none}section{break-before:page;border:0}img{max-height:85vh}}</style><header><h1>Vault — Project diagrams</h1><p>Open any SVG in a new tab to zoom. Use browser Print to save a PDF. Chen ER diagrams describe the implemented application. The notation key labels symbols that are not used in this schema.</p><nav>'''
page+=''.join(f'<a href="#{n}">{title}</a>' for n,title,_ in items)+'</nav></header><main>'
for n,title,desc in items:page+=f'<section id="{n}"><h2>{title}</h2><p>{desc}</p><div class="links"><a href="{n}.svg" target="_blank">Open SVG</a></div><img src="{n}.svg" alt="{title}"></section>'
(root/'index.html').write_text(page+'</main></html>')

# Generate Chen diagrams after the relational and flow views.
import runpy
runpy.run_path(str(root/"chen.py"))
