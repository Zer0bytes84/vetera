export interface CallRow {patient: string; owner: string; phone: string; type: string; dueDate: string;}
export function callsCsv(rows: CallRow[]): string {
 const cell=(value: string)=>`"${value.replace(/^[=+@-]/," '$&").replaceAll('"','""')}"`;
 return "\uFEFF"+[["Patient","Propriétaire","Téléphone","Rappel","Échéance"],...rows.map(r=>[r.patient,r.owner,r.phone,r.type,r.dueDate])].map(row=>row.map(cell).join(";")).join("\r\n");
}
export function callsPrintHtml(rows: CallRow[]): string {
 const escape=(value: string)=>value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
 return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Liste d’appels du jour</title><style>body{font-family:-apple-system,sans-serif;color:#292929;padding:24px}h1{font-size:24px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:12px;border-bottom:1px solid #F2F2F2}th{background:#F5F5F5}</style><h1>Liste d’appels du jour</h1><table><thead><tr>${["Patient","Propriétaire","Téléphone","Rappel","Échéance"].map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${[row.patient,row.owner,row.phone,row.type,row.dueDate].map(value=>`<td>${escape(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></html>`;
}
