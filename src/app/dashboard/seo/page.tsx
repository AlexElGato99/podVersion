"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, Search, Share2, Settings, Eye, EyeOff, CheckCircle2,
  AlertCircle, Loader2, Save, Monitor, Smartphone,
  MessageCircle, ThumbsUp, Link2, ShieldCheck, Code2, ChevronDown,
  Info, Home, ShoppingBag, Package, ShoppingCart, CreditCard,
  ListChecks, ImageOff, BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface PageSEO {
  id: string; label: string; path: string;
  title: string; description: string;
  og_title: string; og_description: string; og_image: string;
  twitter_title: string; twitter_description: string; twitter_image: string;
  canonical: string; robots: string; schema_enabled: boolean;
}
interface SiteSettings {
  site_name: string; title_separator: string; default_og_image: string;
  twitter_handle: string; site_url: string;
  google_verification: string; bing_verification: string;
}

/* ─── Page definitions ───────────────────────────────────── */
const PAGES: { id: string; label: string; path: string; icon: LucideIcon; defaultTitle: string; defaultDesc: string }[] = [
  { id:"home",        label:"Homepage",    path:"/",            icon:Home,         defaultTitle:"Custom Print-on-Demand Apparel & Gifts | PrintDrop",             defaultDesc:"Shop unique artist-designed graphic tees, hoodies, mugs & gifts at PrintDrop. Printed on demand, shipped across the USA. Free shipping on orders $50+." },
  { id:"shop",        label:"Shop",        path:"/shop",        icon:ShoppingBag,  defaultTitle:"Shop Custom Graphic Tees, Hoodies & Gifts | PrintDrop",          defaultDesc:"Browse PrintDrop's full catalog of artist-designed graphic tees, hoodies, mugs, posters, stickers & more. Free US shipping on orders $50+." },
  { id:"collections", label:"Collections", path:"/collections", icon:Package,      defaultTitle:"Curated Collections — Streetwear, Sportswear, Gifts | PrintDrop",defaultDesc:"Explore PrintDrop curated collections: Bestsellers, Streetwear, Sportswear, Eco-friendly & Gift sets. Shipped across the USA." },
  { id:"about",       label:"About",       path:"/about",       icon:Info,         defaultTitle:"About PrintDrop — Artist-Designed Custom Apparel & Gifts",       defaultDesc:"PrintDrop is an independent artist-run print-on-demand store. Unique graphic tees, hoodies & gifts — printed on demand, fulfilled by Printful." },
  { id:"cart",        label:"Cart",        path:"/cart",        icon:ShoppingCart, defaultTitle:"Your Cart | PrintDrop",                                           defaultDesc:"Review your PrintDrop order before checkout." },
  { id:"checkout",    label:"Checkout",    path:"/checkout",    icon:CreditCard,   defaultTitle:"Secure Checkout | PrintDrop",                                     defaultDesc:"Complete your PrintDrop order securely." },
];

const ROBOTS_OPTIONS = [
  { value:"index,follow",     label:"Index, Follow — recommended for public pages" },
  { value:"noindex,follow",   label:"No Index, Follow — hide from Google" },
  { value:"index,nofollow",   label:"Index, No Follow" },
  { value:"noindex,nofollow", label:"No Index, No Follow — fully private" },
];

const SEPARATORS = [" | "," — "," · "," - "," » "," • "];

function emptyPage(p: typeof PAGES[0]): PageSEO {
  return { id:p.id, label:p.label, path:p.path, title:p.defaultTitle, description:p.defaultDesc,
    og_title:p.defaultTitle, og_description:p.defaultDesc, og_image:"",
    twitter_title:p.defaultTitle, twitter_description:p.defaultDesc, twitter_image:"",
    canonical:`https://printdrop.com${p.path}`, robots:"index,follow", schema_enabled:true };
}

const DEFAULT_SITE: SiteSettings = {
  site_name:"PrintDrop", title_separator:" | ", default_og_image:"",
  twitter_handle:"@printdrop", site_url:"https://printdrop.com",
  google_verification:"", bing_verification:"",
};

/* ─── Shared style helpers ───────────────────────────────── */
const s = {
  card:     { background:"var(--bg-primary)",   border:"1px solid var(--border)",   borderRadius:16 } as React.CSSProperties,
  cardSm:   { background:"var(--bg-primary)",   border:"1px solid var(--border)",   borderRadius:12 } as React.CSSProperties,
  input:    { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg-secondary)", color:"var(--text-primary)", fontSize:13, outline:"none", boxSizing:"border-box" as const },
  textarea: { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg-secondary)", color:"var(--text-primary)", fontSize:13, outline:"none", boxSizing:"border-box" as const, resize:"vertical" as const },
  label:    { display:"block", fontSize:11, fontWeight:600, textTransform:"uppercase" as const, letterSpacing:"0.05em", color:"var(--text-muted)", marginBottom:6 },
  hint:     { fontSize:11, color:"var(--text-muted)", marginTop:4 },
  badge:    (ok:boolean) => ({ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, fontWeight:500, padding:"2px 10px", borderRadius:999, border:"1px solid", background:ok?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)", borderColor:ok?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)", color:ok?"#22c55e":"#ef4444" } as React.CSSProperties),
};

/* ─── Sub-components ─────────────────────────────────────── */
function CharCount({ val, max, warn }: { val:string; max:number; warn:number }) {
  const len = val.length;
  const color = len===0?"var(--text-muted)":len>max?"#ef4444":len>warn?"#f59e0b":"#22c55e";
  const pct = Math.min(len/max,1);
  const barColor = len>max?"#ef4444":len>warn?"#f59e0b":"#22c55e";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
      <div style={{ flex:1, height:3, borderRadius:99, background:"var(--bg-tertiary)", overflow:"hidden" }}>
        <div style={{ width:`${pct*100}%`, background:barColor, height:"100%", borderRadius:99, transition:"width 0.15s" }} />
      </div>
      <span style={{ fontSize:11, tabularNums:true, color, fontWeight:len>max?700:400 } as React.CSSProperties}>{len}/{max}</span>
    </div>
  );
}

function Field({ label, hint, children }: { label:string; hint?:string; children:React.ReactNode }) {
  return (
    <div>
      <span style={s.label}>{label}</span>
      {children}
      {hint && <p style={s.hint}>{hint}</p>}
    </div>
  );
}

function SerpPreview({ title, description, url, mode }: { title:string; description:string; url:string; mode:"desktop"|"mobile" }) {
  const t = title.length>60?title.slice(0,57)+"…":title;
  const d = description.length>160?description.slice(0,157)+"…":description;
  const b = url.replace(/https?:\/\//,"");
  const cardStyle:React.CSSProperties = { ...s.card, padding: mode==="mobile"?16:20, maxWidth:mode==="mobile"?320:"100%" };
  return (
    <div style={cardStyle}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
        <div style={{ width:16, height:16, borderRadius:mode==="mobile"?999:4, background:"var(--bg-tertiary)" }} />
        {mode==="desktop" && (
          <div>
            <p style={{ fontSize:12, color:"var(--text-primary)", margin:0 }}>PrintDrop</p>
            <p style={{ fontSize:11, color:"var(--text-muted)", margin:0, maxWidth:320, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b}</p>
          </div>
        )}
        {mode==="mobile" && <span style={{ fontSize:11, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b}</span>}
      </div>
      <p style={{ fontSize:mode==="mobile"?13:17, color:"#60a5fa", margin:"0 0 4px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" } as React.CSSProperties}>{t||"Page title"}</p>
      <p style={{ fontSize:mode==="mobile"?12:13, color:"var(--text-secondary)", margin:0, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" } as React.CSSProperties}>{d||"Page description"}</p>
    </div>
  );
}

function SocialCard({ title, description, image }: { title:string; description:string; image:string }) {
  return (
    <div style={{ ...s.cardSm, overflow:"hidden" }}>
      <div style={{ width:"100%", height:120, background:"var(--bg-tertiary)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        {image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={(e)=>{(e.target as HTMLImageElement).style.display="none";}} />
          : <ImageOff size={28} color="var(--text-muted)" />
        }
      </div>
      <div style={{ padding:"10px 12px", borderTop:"1px solid var(--border)" }}>
        <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--text-muted)", margin:"0 0 3px" }}>printdrop.com</p>
        <p style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", margin:"0 0 2px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{title||"Page title"}</p>
        <p style={{ fontSize:11, color:"var(--text-secondary)", margin:0, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" } as React.CSSProperties}>{description||"Page description"}</p>
      </div>
    </div>
  );
}

function Accordion({ label, icon: Icon, open, onToggle, children }: { label:string; icon:LucideIcon; open:boolean; onToggle:()=>void; children:React.ReactNode }) {
  return (
    <div style={{ ...s.card, overflow:"hidden" }}>
      <button onClick={onToggle} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:"none", border:"none", cursor:"pointer", color:"var(--text-primary)", fontSize:13, fontWeight:600 }}>
        <span style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Icon size={14} color="var(--accent)" />
          {label}
        </span>
        <ChevronDown size={14} color="var(--text-muted)" style={{ transform:open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }} />
      </button>
      {open && (
        <div style={{ padding:"0 20px 20px", borderTop:"1px solid var(--border)" }}>
          <div style={{ height:16 }} />
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function SeoSettingsPage() {
  const [pages, setPages]           = useState<PageSEO[]>(PAGES.map(emptyPage));
  const [site, setSite]             = useState<SiteSettings>(DEFAULT_SITE);
  const [activeTab, setActiveTab]   = useState("site");
  const [activePage, setActivePage] = useState("home");
  const [serpMode, setSerpMode]     = useState<"desktop"|"mobile">("desktop");
  const [socialNet, setSocialNet]   = useState<"facebook"|"twitter">("facebook");
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [msg, setMsg]               = useState<{type:"success"|"error";text:string}|null>(null);
  const [openAcc, setOpenAcc]       = useState("basic");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/seo-settings");
        const json = await res.json();
        if (json.settings?.length) {
          const siteRow = json.settings.find((r:{id:string})=>r.id==="__site__");
          if (siteRow) setSite({...DEFAULT_SITE,...siteRow});
          const rows: PageSEO[] = json.settings.filter((r:{id:string})=>r.id!=="__site__");
          setPages(PAGES.map(p=>{ const saved=rows.find(r=>r.id===p.id); return saved?{...emptyPage(p),...saved}:emptyPage(p); }));
        }
      } catch { /* use defaults */ }
      setLoading(false);
    })();
  }, []);

  const cur = pages.find(p=>p.id===activePage)??pages[0];
  const upd = (key:keyof PageSEO, val:string|boolean) => setPages(ps=>ps.map(p=>p.id===activePage?{...p,[key]:val}:p));

  const save = useCallback(async () => {
    setSaving(true); setMsg(null);
    try {
      await fetch("/api/seo-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:"__site__",...site})});
      await Promise.all(pages.map(p=>fetch("/api/seo-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)})));
      setMsg({type:"success",text:"SEO settings saved successfully!"});
    } catch(e) { setMsg({type:"error",text:`Save failed: ${(e as Error).message}`}); }
    setSaving(false);
    setTimeout(()=>setMsg(null),6000);
  },[pages,site]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, gap:12, color:"var(--text-muted)" }}>
      <Loader2 size={20} style={{ animation:"spin 1s linear infinite" }} /> Loading SEO settings…
    </div>
  );

  const TABS = [
    {id:"site",   label:"Site Settings",   icon:Settings},
    {id:"pages",  label:"Page SEO",        icon:Globe},
    {id:"social", label:"Social / OG",     icon:Share2},
    {id:"robots", label:"Indexing",        icon:ShieldCheck},
    {id:"schema", label:"Structured Data", icon:Code2},
  ];

  return (
    <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 16px 100px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:"var(--text-primary)", margin:0 }}>SEO Settings</h1>
          <p style={{ fontSize:13, color:"var(--text-secondary)", marginTop:4, marginBottom:0 }}>Manage titles, descriptions, Open Graph, robots, and structured data — like Yoast SEO for your store.</p>
        </div>
        <button onClick={save} disabled={saving} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:10, background:"#ea580c", color:"#fff", fontSize:13, fontWeight:700, border:"none", cursor:saving?"not-allowed":"pointer", opacity:saving?0.6:1 }}>
          {saving?<Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/>:<Save size={14}/>}
          {saving?"Saving…":"Save All"}
        </button>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderRadius:12, marginBottom:16, fontSize:13, fontWeight:500, border:"1px solid", background:msg.type==="success"?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)", borderColor:msg.type==="success"?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)", color:msg.type==="success"?"#22c55e":"#ef4444" }}>
          {msg.type==="success"?<CheckCircle2 size={15}/>:<AlertCircle size={15}/>} {msg.text}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, background:"var(--bg-tertiary)", borderRadius:12, padding:4, marginBottom:24, overflowX:"auto" }}>
        {TABS.map(({id,label,icon:Icon})=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:500, whiteSpace:"nowrap", border:"none", cursor:"pointer", transition:"all 0.15s", background:activeTab===id?"var(--bg-primary)":  "transparent", color:activeTab===id?"var(--text-primary)":"var(--text-muted)", boxShadow:activeTab===id?"0 1px 3px rgba(0,0,0,0.1)":"none" }}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      {/* ── SITE SETTINGS ── */}
      {activeTab==="site" && (
        <div style={{ display:"grid", gap:20, gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))" }}>
          <div style={{ ...s.card, padding:20, gridColumn:"1 / -1" }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 16px", display:"flex", alignItems:"center", gap:8 }}>
              <Globe size={14} color="#ea580c"/>Site-Wide Settings
            </h2>
            <div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))" }}>
              <Field label="Site Name" hint={`Appended to titles: Page Name${site.title_separator}${site.site_name}`}>
                <input style={s.input} type="text" value={site.site_name} onChange={e=>setSite(s=>({...s,site_name:e.target.value}))} placeholder="PrintDrop"/>
              </Field>
              <div>
                <span style={s.label}>Title Separator</span>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {SEPARATORS.map(sep=>(
                    <button key={sep} onClick={()=>setSite(s=>({...s,title_separator:sep}))} style={{ padding:"6px 12px", borderRadius:8, border:"1px solid", fontSize:13, fontFamily:"monospace", cursor:"pointer", background:site.title_separator===sep?"rgba(234,88,12,0.1)":"var(--bg-secondary)", borderColor:site.title_separator===sep?"#ea580c":"var(--border)", color:site.title_separator===sep?"#ea580c":"var(--text-secondary)" }}>
                      {sep}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Site URL">
                <input style={s.input} type="url" value={site.site_url} onChange={e=>setSite(s=>({...s,site_url:e.target.value}))} placeholder="https://printdrop.com"/>
              </Field>
              <Field label="Twitter / X Handle">
                <input style={s.input} type="text" value={site.twitter_handle} onChange={e=>setSite(s=>({...s,twitter_handle:e.target.value}))} placeholder="@printdrop"/>
              </Field>
              <div style={{ gridColumn:"1 / -1" }}>
                <Field label="Default OG Image URL" hint="Used when a page has no specific OG image. 1200x630px recommended.">
                  <input style={s.input} type="url" value={site.default_og_image} onChange={e=>setSite(s=>({...s,default_og_image:e.target.value}))} placeholder="https://printdrop.com/og-default.jpg"/>
                </Field>
              </div>
              <Field label="Google Search Console Verification" hint="From Google Search Console → Settings → Ownership verification">
                <input style={s.input} type="text" value={site.google_verification} onChange={e=>setSite(s=>({...s,google_verification:e.target.value}))} placeholder="Paste content value from HTML tag"/>
              </Field>
              <Field label="Bing Webmaster Verification">
                <input style={s.input} type="text" value={site.bing_verification} onChange={e=>setSite(s=>({...s,bing_verification:e.target.value}))} placeholder="msvalidate.01=xxxxxxxx"/>
              </Field>
            </div>
          </div>

          {/* Checklist */}
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}>
              <ListChecks size={14} color="#ea580c"/>SEO Checklist
            </h2>
            <ul style={{ listStyle:"none", margin:0, padding:0, display:"flex", flexDirection:"column", gap:8 }}>
              {[
                {ok:!!site.site_name,           text:"Site name configured"},
                {ok:!!site.site_url,            text:"Site URL set"},
                {ok:!!site.default_og_image,    text:"Default OG image set"},
                {ok:!!site.google_verification, text:"Google Search Console verified"},
                {ok:!!site.twitter_handle,      text:"Twitter handle set"},
                {ok:!!site.bing_verification,   text:"Bing Webmaster verified"},
              ].map(({ok,text})=>(
                <li key={text} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:ok?"#22c55e":"var(--text-secondary)" }}>
                  {ok?<CheckCircle2 size={13}/>:<AlertCircle size={13} color="var(--text-muted)"/>}{text}
                </li>
              ))}
            </ul>
          </div>

          {/* Next steps */}
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}>
              <BarChart3 size={14} color="#ea580c"/>After Saving — Apply to Layouts
            </h2>
            <ol style={{ margin:0, padding:"0 0 0 16px", display:"flex", flexDirection:"column", gap:8, fontSize:12, color:"var(--text-secondary)", lineHeight:1.6 }}>
              <li>Fetch seo_settings in each page/layout server component</li>
              <li>Pass title, description, og:* to Next.js metadata export</li>
              <li>Add verification meta tags to layout.tsx head</li>
              <li>Submit sitemap to Google Search Console</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── PAGE SEO ── */}
      {activeTab==="pages" && (
        <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:20, alignItems:"start" }}>
          {/* Page list */}
          <div style={{ ...s.card, padding:8, position:"sticky", top:16 }}>
            <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--text-muted)", padding:"4px 12px 8px", margin:0 }}>Pages</p>
            {PAGES.map(p=>{
              const pg = pages.find(x=>x.id===p.id);
              const ok = pg&&pg.title&&pg.description;
              const active = activePage===p.id;
              return (
                <button key={p.id} onClick={()=>setActivePage(p.id)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"8px 12px", borderRadius:10, textAlign:"left", border:"none", cursor:"pointer", background:active?"rgba(234,88,12,0.08)":"transparent", color:active?"#ea580c":"var(--text-secondary)", fontWeight:active?600:400, fontSize:13 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:8 }}><p.icon size={13}/>{p.label}</span>
                  <span style={{ width:7, height:7, borderRadius:999, background:ok?"#22c55e":"var(--bg-tertiary)", border:"1px solid", borderColor:ok?"#22c55e":"var(--border)", flexShrink:0 }}/>
                </button>
              );
            })}
          </div>

          {/* Editor */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* SERP preview */}
            <div style={{ ...s.card, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:0, display:"flex", alignItems:"center", gap:8 }}><Search size={13} color="#ea580c"/>Google SERP Preview</h3>
                <div style={{ display:"flex", gap:4 }}>
                  {(["desktop","mobile"] as const).map(m=>(
                    <button key={m} onClick={()=>setSerpMode(m)} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer", background:serpMode===m?"var(--text-primary)":"var(--bg-tertiary)", color:serpMode===m?"var(--bg-primary)":"var(--text-muted)" }}>
                      {m==="desktop"?<Monitor size={12}/>:<Smartphone size={12}/>}{m}
                    </button>
                  ))}
                </div>
              </div>
              <SerpPreview title={cur.title} description={cur.description} url={cur.canonical||`https://printdrop.com${cur.path}`} mode={serpMode}/>
            </div>

            <Accordion label="Basic SEO — Title & Description" icon={Search} open={openAcc==="basic"} onToggle={()=>setOpenAcc(openAcc==="basic"?"":"basic")}>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <Field label="SEO Title — shown in Google" hint="Optimal: 50–60 characters. Put primary keyword first.">
                  <input style={s.input} type="text" value={cur.title} onChange={e=>upd("title",e.target.value)} placeholder="Page Title | PrintDrop"/>
                  <CharCount val={cur.title} max={60} warn={50}/>
                </Field>
                <Field label="Meta Description — shown below title in Google" hint="Optimal: 140–160 characters. Include primary keyword + CTA.">
                  <textarea style={s.textarea} rows={3} value={cur.description} onChange={e=>upd("description",e.target.value)} placeholder="Describe the page. Include primary keyword + CTA."/>
                  <CharCount val={cur.description} max={160} warn={140}/>
                </Field>
                <Field label="Canonical URL — prevents duplicate content">
                  <div style={{ position:"relative" }}>
                    <Link2 size={13} color="var(--text-muted)" style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
                    <input style={{ ...s.input, paddingLeft:30 }} type="url" value={cur.canonical} onChange={e=>upd("canonical",e.target.value)} placeholder={`https://printdrop.com${cur.path}`}/>
                  </div>
                </Field>
              </div>
            </Accordion>

            <Accordion label="Open Graph — Facebook & LinkedIn" icon={Share2} open={openAcc==="og"} onToggle={()=>setOpenAcc(openAcc==="og"?"":"og")}>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <Field label="OG Title">
                    <input style={s.input} type="text" value={cur.og_title} onChange={e=>upd("og_title",e.target.value)} placeholder="Same as SEO title or expanded (up to 90 chars)"/>
                    <CharCount val={cur.og_title} max={90} warn={70}/>
                  </Field>
                  <Field label="OG Description">
                    <input style={s.input} type="text" value={cur.og_description} onChange={e=>upd("og_description",e.target.value)} placeholder="Same as meta description"/>
                    <CharCount val={cur.og_description} max={200} warn={160}/>
                  </Field>
                </div>
                <Field label="OG Image URL — 1200x630px recommended">
                  <input style={s.input} type="url" value={cur.og_image} onChange={e=>upd("og_image",e.target.value)} placeholder="https://printdrop.com/og/page.jpg"/>
                </Field>
                <div>
                  <p style={{ ...s.label, marginBottom:8 }}>Facebook Preview</p>
                  <SocialCard title={cur.og_title||cur.title} description={cur.og_description||cur.description} image={cur.og_image}/>
                </div>
              </div>
            </Accordion>

            <Accordion label="Twitter / X Card" icon={MessageCircle} open={openAcc==="twitter"} onToggle={()=>setOpenAcc(openAcc==="twitter"?"":"twitter")}>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <Field label="Twitter Title">
                    <input style={s.input} type="text" value={cur.twitter_title} onChange={e=>upd("twitter_title",e.target.value)} placeholder="Same as SEO title"/>
                    <CharCount val={cur.twitter_title} max={70} warn={60}/>
                  </Field>
                  <Field label="Twitter Description">
                    <input style={s.input} type="text" value={cur.twitter_description} onChange={e=>upd("twitter_description",e.target.value)} placeholder="Same as meta description"/>
                    <CharCount val={cur.twitter_description} max={200} warn={160}/>
                  </Field>
                </div>
                <Field label="Twitter Image — 1200x628px recommended">
                  <input style={s.input} type="url" value={cur.twitter_image} onChange={e=>upd("twitter_image",e.target.value)} placeholder="https://printdrop.com/og/page.jpg"/>
                </Field>
                <SocialCard title={cur.twitter_title||cur.title} description={cur.twitter_description||cur.description} image={cur.twitter_image||cur.og_image}/>
              </div>
            </Accordion>
          </div>
        </div>
      )}

      {/* ── SOCIAL OVERVIEW ── */}
      {activeTab==="social" && (
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div style={{ display:"flex", gap:8 }}>
            {([{id:"facebook",label:"Facebook / LinkedIn",icon:ThumbsUp},{id:"twitter",label:"Twitter / X",icon:MessageCircle}] as const).map(n=>(
              <button key={n.id} onClick={()=>setSocialNet(n.id)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:10, fontSize:13, fontWeight:500, border:"1px solid", cursor:"pointer", background:socialNet===n.id?"rgba(234,88,12,0.08)":"var(--bg-primary)", borderColor:socialNet===n.id?"#ea580c":"var(--border)", color:socialNet===n.id?"#ea580c":"var(--text-secondary)" }}>
                <n.icon size={13}/>{n.label}
              </button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16 }}>
            {PAGES.map(p=>{
              const pg = pages.find(x=>x.id===p.id)!;
              const title = socialNet==="facebook"?pg.og_title:pg.twitter_title;
              const desc  = socialNet==="facebook"?pg.og_description:pg.twitter_description;
              const img   = socialNet==="facebook"?pg.og_image:pg.twitter_image;
              return (
                <div key={p.id} style={{ ...s.card, padding:16 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", margin:"0 0 12px", display:"flex", alignItems:"center", gap:6 }}><p.icon size={12}/>{p.label}</p>
                  <SocialCard title={title||pg.title} description={desc||pg.description} image={img||pg.og_image}/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── INDEXING ── */}
      {activeTab==="robots" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", borderRadius:12, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.3)", fontSize:13, color:"var(--text-secondary)" }}>
            <AlertCircle size={15} color="#f59e0b" style={{ flexShrink:0, marginTop:1 }}/>
            <div><strong style={{ color:"var(--text-primary)" }}>Indexing controls</strong> — &ldquo;No Index&rdquo; removes a page from Google. Only block pages you truly want hidden (checkout, account, admin).</div>
          </div>
          {PAGES.map(p=>{
            const pg = pages.find(x=>x.id===p.id)!;
            const indexed = pg.robots==="index,follow";
            return (
              <div key={p.id} style={{ ...s.card, padding:"14px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                <p.icon size={14} color="var(--text-muted)" style={{ flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", margin:0 }}>{p.label}</p>
                  <p style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"monospace", margin:"2px 0 0" }}>{p.path}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <span style={s.badge(indexed)}>{indexed?<Eye size={10}/>:<EyeOff size={10}/>}{indexed?"Indexed":"Hidden from Google"}</span>
                  <select value={pg.robots} onChange={e=>setPages(ps=>ps.map(x=>x.id===p.id?{...x,robots:e.target.value}:x))} style={{ fontSize:12, border:"1px solid var(--border)", borderRadius:8, padding:"6px 10px", background:"var(--bg-secondary)", color:"var(--text-primary)", outline:"none", cursor:"pointer" }}>
                    {ROBOTS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── STRUCTURED DATA ── */}
      {activeTab==="schema" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 4px", display:"flex", alignItems:"center", gap:8 }}><Code2 size={14} color="#ea580c"/>Structured Data (JSON-LD) — Per Page</h2>
            <p style={{ fontSize:12, color:"var(--text-muted)", margin:"0 0 16px" }}>Enable schema markup per page. Tells Google to show rich results (prices, FAQs, breadcrumbs) in search.</p>
            <div>
              {PAGES.map((p,i)=>{
                const pg = pages.find(x=>x.id===p.id)!;
                return (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:i<PAGES.length-1?"1px solid var(--border)":"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <p.icon size={13} color="var(--text-muted)"/>
                      <div>
                        <p style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", margin:0 }}>{p.label}</p>
                        <p style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"monospace", margin:"2px 0 0" }}>{p.path}</p>
                      </div>
                    </div>
                    <button onClick={()=>setPages(ps=>ps.map(x=>x.id===p.id?{...x,schema_enabled:!x.schema_enabled}:x))} style={{ position:"relative", width:44, height:24, borderRadius:999, border:"none", cursor:"pointer", background:pg.schema_enabled?"#ea580c":"var(--bg-tertiary)", transition:"background 0.2s" }}>
                      <span style={{ position:"absolute", top:2, left:2, width:20, height:20, borderRadius:999, background:"white", boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transform:pg.schema_enabled?"translateX(20px)":"translateX(0)", transition:"transform 0.2s" }}/>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ ...s.card, padding:20 }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 14px" }}>Active Schema Types (Auto-Applied)</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                {name:"Organization",   desc:"Site-wide brand schema — helps Google Knowledge Panel"},
                {name:"OnlineStore",    desc:"Marks site as an e-commerce store"},
                {name:"Product",        desc:"Price, availability, image on all product pages"},
                {name:"BreadcrumbList", desc:"Navigation breadcrumbs on product pages"},
                {name:"FAQPage",        desc:"FAQ rich results on product pages — Q&A in Google search"},
              ].map(({name,desc})=>(
                <div key={name} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", borderRadius:10, background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink:0, marginTop:1 }}/>
                  <div>
                    <span style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>{name}</span>
                    <span style={{ fontSize:12, color:"var(--text-secondary)", marginLeft:8 }}>{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50, borderTop:"1px solid var(--border)", background:"var(--bg-primary)", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
        <p style={{ fontSize:12, color:"var(--text-muted)", margin:0 }}>Settings stored in Supabase. Connect to your page layouts to apply live.</p>
        <button onClick={save} disabled={saving} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 20px", borderRadius:8, background:"#ea580c", color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:saving?"not-allowed":"pointer", opacity:saving?0.6:1 }}>
          {saving?<Loader2 size={13} style={{ animation:"spin 1s linear infinite" }}/>:<Save size={13}/>}
          {saving?"Saving…":"Save All Settings"}
        </button>
      </div>
    </div>
  );
}