// Runs once on first startup through docker-entrypoint-initdb.d.
const bank = db.getSiblingDB('vault_documents');
bank.kyc_documents.insertMany([
 {customer_id:1,name:'Aarav Sharma',verified:true,documents:[{type:'PAN',status:'verified'},{type:'Address proof',status:'verified'}],preferences:{language:'English',alerts:['email','sms']}},
 {customer_id:2,name:'Diya Patel',verified:true,documents:[{type:'PAN',status:'verified'}],preferences:{language:'Gujarati',alerts:['email']}},
 {customer_id:5,name:'Kabir Mehta',verified:false,documents:[{type:'Student ID',status:'pending'}],preferences:{language:'Hindi',alerts:['sms']}}
]);
bank.kyc_documents.createIndex({customer_id:1},{unique:true});
bank.kyc_documents.createIndex({'documents.type':1});
bank.knowledge.insertMany([
 {title:'Savings account',body:'Savings accounts require a minimum balance and verified identity.',tags:['savings','accounts']},
 {title:'Home loan',body:'Home loan eligibility requires income proof and verified KYC.',tags:['loans','housing']},
 {title:'Education loan',body:'Education loan finance covers tuition and student expenses.',tags:['loans','education']}
]);
bank.knowledge.createIndex({title:'text',body:'text'});
