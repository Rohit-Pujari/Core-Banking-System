"""Chen ER diagrams for the implemented schema. Requires Graphviz."""
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parent
entities={
 'Customer':['customer_id','name','email','phone','created_at','KYC'],
 'Branch':['branch_id','name','city'],
 'Account':['account_id','account_number','kind','balance','status'],
 'Transfer':['transfer_id','amount','narration','created_at'],
 'Balance_Audit':['audit_id','old_balance','new_balance','actor','created_at'],
 'Loan':['loan_id','kind','principal','rate','months','status','reviewed_at','EMI'],
 'User':['user_id','name','email','password_hash','role'],
 'Session':['token_hash','expires_at','created_at']}
# Min/max beside an entity means how many relationship instances it participates in.
relations=[
 ('Customer','Owns','Account','(0,N)','(1,1)'),
 ('Branch','Maintains','Account','(0,N)','(1,1)'),
 ('Account','Sends','Transfer','(0,N)','(1,1)'),
 ('Account','Receives','Transfer','(0,N)','(1,1)'),
 ('Account','Records','Balance_Audit','(0,N)','(1,1)'),
 ('Customer','Borrows','Loan','(0,N)','(1,1)'),
 ('Customer','Has_login','User','(0,1)','(0,1)'),
 ('User','Reviews','Loan','(0,N)','(0,1)'),
 ('User','Has_session','Session','(0,N)','(1,1)'),
 ('Branch','Parent_of','Branch','parent (0,N)','child (0,1)')]
def render(name,title,names,attributes=True):
 lines=['graph ER {',f'graph [label="{title}", labelloc=t, fontsize=22, fontname="Arial", bgcolor="white", pad=0.45, nodesep=0.4, ranksep=1.0, overlap=false, splines=true];', 'node [fontname="Arial", fontsize=13, style=filled, fillcolor="#d7ead0", color="#333333"];', 'edge [fontname="Arial", fontsize=11, color="#333333"];']
 for name_ in names:
  lines.append(f'{name_} [shape=box, label="{name_.replace("_"," ")}", margin="0.18,0.12"];')
  if not attributes:continue
  for index,attr in enumerate(entities[name_]):
   node=f'{name_}_{attr}'
   label=f'<<U>{attr}</U>>' if index==0 else f'"{attr}"'
   style=', style="filled,dashed"' if attr=='EMI' else ''
   lines.append(f'{node} [shape=ellipse,label={label}{style}]; {name_} -- {node};')
   if attr=='KYC':
    for component in ['verified','occupation','risk']:
     lines.append(f'kyc_{component} [shape=ellipse,label="{component}"]; {node} -- kyc_{component};')
 for i,(a,rel,b,am,bm) in enumerate(relations):
  if a not in names or b not in names:continue
  lines.append(f'r{i} [shape=diamond,label="{rel.replace("_"," ")}",fillcolor="#e5efdf",height=0.7];')
  lines.append(f'{a} -- r{i} [label="{am}"]; r{i} -- {b} [label="{bm}"];')
 lines.append('}')
 source=root/(name+'.dot');source.write_text('\n'.join(lines))
 subprocess.run(['dot','-Tsvg',str(source),'-o',str(root/(name+'.svg'))],check=True)
render('01-er-diagram','Vault — Chen ER diagram',list(entities))
render('06-chen-banking','Bank accounts and transfers — Chen ER',['Customer','Branch','Account','Transfer','Balance_Audit'])
render('07-chen-access-loans','Logins and loans — Chen ER',['Customer','User','Session','Loan'])
render('08-chen-relationships','Vault — relationship overview (attributes omitted)',list(entities),False)
# A compact, hand-drawn SVG key explains symbols without inventing schema features.
(root/'09-chen-notation.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="730" viewBox="0 0 1100 730">
<style>text{font:16px Arial;fill:#222}.shape{fill:#d7ead0;stroke:#333;stroke-width:1.5}.line{stroke:#333;stroke-width:1.5;fill:none}.title{font-size:25px;font-weight:bold}.small{font-size:14px}</style>
<rect width="1100" height="730" fill="white"/><text x="35" y="40" class="title">Chen notation — symbol key</text>
<rect x="40" y="75" width="150" height="48" class="shape"/><text x="75" y="105">Account</text><text x="260" y="105">Rectangle: entity with its own identity.</text>
<polygon points="115,145 200,180 115,215 30,180" class="shape"/><text x="92" y="185">Owns</text><text x="260" y="185">Diamond: relationship between entities.</text>
<ellipse cx="115" cy="260" rx="80" ry="29" class="shape"/><text x="72" y="265" text-decoration="underline">account_id</text><text x="260" y="265">Underlined oval: key attribute. Plain oval: simple attribute.</text>
<ellipse cx="115" cy="340" rx="75" ry="28" class="shape" stroke-dasharray="6 4"/><text x="98" y="345">EMI</text><text x="260" y="345">Dashed oval: derived attribute, calculated from principal, rate and months.</text>
<ellipse cx="115" cy="420" rx="80" ry="30" class="shape"/><ellipse cx="115" cy="420" rx="73" ry="24" class="line"/><text x="85" y="425">Phone</text><text x="260" y="413">Double oval: multivalued attribute (notation example only).</text><text x="260" y="438" class="small">Our customer phone field holds one value, so it uses a single oval.</text>
<rect x="40" y="475" width="150" height="50" class="shape"/><rect x="46" y="481" width="138" height="38" class="line"/><text x="70" y="506">Dependent</text><text x="260" y="495">Double rectangle: weak entity (notation example only).</text><text x="260" y="520" class="small">Identified by an owner's key + its partial key; no weak entities in this schema.</text>
<polygon points="115,552 200,590 115,628 30,590" class="shape"/><polygon points="115,559 185,590 115,621 45,590" class="line"/><text x="87" y="595">Identifies</text><text x="260" y="582">Double diamond: identifying relationship for a weak entity.</text><text x="260" y="607" class="small">A partial key uses a dashed underline. It is not a globally unique primary key.</text>
<text x="35" y="665">Composite attribute: one oval connected to component ovals. Example: KYC → verified, occupation, risk.</text>
<text x="35" y="695">(0,N) optional many · (1,1) exactly one · (0,1) optional one. Minimum 1 means total participation.</text>
</svg>''')
