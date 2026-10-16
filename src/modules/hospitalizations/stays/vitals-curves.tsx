import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { VitalSign } from "./store";
const metrics=[{key:"temperature_c",label:"Température",unit:"°C"},{key:"heart_rate",label:"Fréquence cardiaque",unit:"/min"},{key:"respiratory_rate",label:"Fréquence respiratoire",unit:"/min"},{key:"weight_kg",label:"Poids",unit:"kg"}] as const;
export function VitalsCurves({vitals}: {vitals: VitalSign[]}) {
 return <div className="grid gap-4 sm:grid-cols-2">{metrics.map(metric => {
  const data=vitals.filter(vital => vital[metric.key] !== null).map(vital => ({time:new Date(vital.recorded_at).getTime(),value:vital[metric.key]}));
  if (!data.length) return null;
  return <figure key={metric.key} className="min-w-0 rounded-xl border p-4"><figcaption className="text-[13px] font-medium">{metric.label} ({metric.unit})</figcaption><div className="mt-3 h-36" role="img" aria-label={`${metric.label} : ${data.length} mesure(s)`}><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="time" tickFormatter={time => new Date(time).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} tick={{fontSize:12}} minTickGap={30}/><YAxis domain={["auto","auto"]} width={40} tick={{fontSize:12}}/><Tooltip labelFormatter={time => new Date(Number(time)).toLocaleString("fr-FR")}/><Line type="linear" dataKey="value" name={metric.label} stroke="var(--primary)" strokeWidth={1.5} dot={{r:3}} isAnimationActive={false}/></LineChart></ResponsiveContainer></div></figure>;
 })}</div>;
}
