 "use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "../lib/supabase";
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from "recharts";

type Emp={id:string;code:string;name:string;regular_days:number;casual_days:number};
type Leave={employee_id:string;leave_type:string;leave_date:string;days:number};

export default function Home(){
 const [tab,setTab]=useState("dashboard"),[employees,setEmployees]=useState<Emp[]>([]),[leaves,setLeaves]=useState<Leave[]>([]);
 const [form,setForm]=useState({code:"",name:"",regular:"",casual:""});
 const [leave,setLeave]=useState({employee_id:"",leave_type:"اعتيادي",leave_date:new Date().toISOString().slice(0,10),days:""});
 const [loading,setLoading]=useState(true),[msg,setMsg]=useState("");
 async function load(){
  setLoading(true);
  const {data:e}=await supabase.from("employees").select("id,code,name,annual_entitlements(regular_days,casual_days)").order("code");
  const es=(e||[]).map((x:any)=>({id:x.id,code:x.code,name:x.name,regular_days:Number(x.annual_entitlements?.[0]?.regular_days||0),casual_days:Number(x.annual_entitlements?.[0]?.casual_days||0)}));
  const {data:l}=await supabase.from("leave_entries").select("employee_id,leave_type,leave_date,days");
  setEmployees(es);setLeaves((l||[]).map((x:any)=>({...x,days:Number(x.days)})));if(!leave.employee_id&&es[0])setLeave(v=>({...v,employee_id:es[0].id}));setLoading(false);
 }
 useEffect(()=>{load()},[]);
 const summaries=useMemo(()=>employees.map(e=>{const annual=e.regular_days+e.casual_days,used=leaves.filter(l=>l.employee_id===e.id).reduce((s,l)=>s+l.days,0);return {...e,annual,used,remaining:annual-used}}),[employees,leaves]);
 const totalAnnual=summaries.reduce((s,e)=>s+e.annual,0),totalUsed=leaves.reduce((s,l)=>s+l.days,0);
 const months=Array.from({length:12},(_,i)=>({month:String(i+1),days:leaves.filter(l=>new Date(l.leave_date).getMonth()===i).reduce((s,l)=>s+l.days,0)}));
 async function addEmployee(){
  if(!form.code||!form.name)return setMsg("اكتب الكود والاسم");
  const {data,error}=await supabase.from("employees").insert({code:form.code,name:form.name}).select().single();
  if(error)return setMsg(error.message);
  const {error:ee}=await supabase.from("annual_entitlements").insert({employee_id:data.id,year:new Date().getFullYear(),regular_days:Number(form.regular)||0,casual_days:Number(form.casual)||0});
  if(ee)return setMsg(ee.message);setForm({code:"",name:"",regular:"",casual:""});setMsg("تمت إضافة الموظف");load();
 }
 async function addLeave(){
  if(!leave.employee_id||!leave.leave_date||!Number(leave.days))return setMsg("أكمل بيانات الإجازة");
  const {error}=await supabase.from("leave_entries").insert({...leave,days:Number(leave.days)});
  if(error)return setMsg(error.message);setLeave(v=>({...v,days:""}));setMsg("تم تسجيل الإجازة");load();
 }
 if(loading)return <main className="center">جاري تحميل النظام...</main>;
 return <main>
  <header><div><h1>نظام إدارة الإجازات</h1><p>إدخال البيانات → الحساب التلقائي → Dashboard</p></div></header>
  <nav>{[["dashboard","Dashboard"],["entry","إدخال البيانات"],["employees","الموظفون"]].map(([id,label])=><button className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  <div className="wrap">{msg&&<div className="msg">{msg}</div>}
  {tab==="dashboard"&&<><section className="cards">{[["عدد الموظفين",employees.length],["الرصيد السنوي",totalAnnual],["المستخدم",totalUsed],["المتبقي",totalAnnual-totalUsed]].map(x=><div className="card"><span>{x[0]}</span><b>{x[1]}</b></div>)}</section>
  <section className="panel"><h2>الإجازات حسب الشهر</h2><ResponsiveContainer width="100%" height={300}><BarChart data={months}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis/><Tooltip/><Bar dataKey="days" name="أيام الإجازة"/></BarChart></ResponsiveContainer></section>
  <section className="panel"><h2>الأرصدة</h2><table><thead><tr><th>الكود</th><th>الموظف</th><th>السنوي</th><th>المستخدم</th><th>المتبقي</th></tr></thead><tbody>{summaries.map(e=><tr><td>{e.code}</td><td>{e.name}</td><td>{e.annual}</td><td>{e.used}</td><td>{e.remaining}</td></tr>)}</tbody></table></section></>}
  {tab==="entry"&&<div className="two"><section className="panel"><h2>إضافة موظف</h2><input placeholder="الكود" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/><input placeholder="اسم الموظف" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input type="number" step=".5" placeholder="اعتيادي" value={form.regular} onChange={e=>setForm({...form,regular:e.target.value})}/><input type="number" step=".5" placeholder="عارضة" value={form.casual} onChange={e=>setForm({...form,casual:e.target.value})}/><button className="primary" onClick={addEmployee}>إضافة</button></section>
  <section className="panel"><h2>تسجيل إجازة</h2><select value={leave.employee_id} onChange={e=>setLeave({...leave,employee_id:e.target.value})}>{employees.map(e=><option value={e.id}>{e.code} — {e.name}</option>)}</select><select value={leave.leave_type} onChange={e=>setLeave({...leave,leave_type:e.target.value})}><option>اعتيادي</option><option>عارضة</option></select><input type="date" value={leave.leave_date} onChange={e=>setLeave({...leave,leave_date:e.target.value})}/><input type="number" step=".5" placeholder="عدد الأيام" value={leave.days} onChange={e=>setLeave({...leave,days:e.target.value})}/><button className="primary" onClick={addLeave}>تسجيل الإجازة</button></section></div>}
  {tab==="employees"&&<section className="panel"><h2>الموظفون</h2><table><thead><tr><th>الكود</th><th>الاسم</th><th>اعتيادي</th><th>عارضة</th><th>السنوي</th></tr></thead><tbody>{employees.map(e=><tr><td>{e.code}</td><td>{e.name}</td><td>{e.regular_days}</td><td>{e.casual_days}</td><td>{e.regular_days+e.casual_days}</td></tr>)}</tbody></table></section>}
  </div></main>
}