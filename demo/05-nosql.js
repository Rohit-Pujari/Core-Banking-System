// Live app uploads: show customer ID, timestamp and size.
printjson(db.kyc_uploads.find({}, {uploaded_at: 1, size: 1}).toArray());

// Find the customer with a pending identity document.
printjson(db.kyc_documents.find({'documents.status': 'pending'}, {_id: 0, name: 1, documents: 1}).toArray());

// Count individual documents by review status.
printjson(db.kyc_documents.aggregate([
  {$unwind: '$documents'},
  {$group: {_id: '$documents.status', count: {$sum: 1}}},
  {$sort: {_id: 1}}
]).toArray());

// Search indexed policy text for loan information.
printjson(db.knowledge.find({$text: {$search: 'loan'}}, {_id: 0, title: 1}).toArray());
