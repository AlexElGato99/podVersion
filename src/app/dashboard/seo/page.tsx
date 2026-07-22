"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, Search, Share2, Settings, Eye, EyeOff, CheckCircle2,
  AlertCircle, Loader2, Save, Monitor, Smartphone, MessageCircle,
  ThumbsUp, Link2, ShieldCheck, Code2, ChevronDown, Info, Home,
  ShoppingBag, Package, ShoppingCart, CreditCard, ListChecks,
  ImageOff, BarChart3, Tag, Tags, Star, TrendingUp, FileSearch,
  Zap, Map, Layers, BookOpen, Target, FileText, Hash, Activity,
  Percent, ExternalLink, PlusCircle, Trash2, RefreshCw, Copy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ============================================================
   TYPES
   ============================================================ */
interface KeywordAnalysis {
  keyword: string;
  synonyms: string;
  density: number;
  inTitle: boolean;
  inDesc: boolean;
  inUrl: boolean;
  score: number; // 0-100
}

interface RedirectRule {
  id: string;
  from: string;
  to: string;
  type: "301" | "302";
}

interface SitemapEntry {
  pageId: string;
  include: boolean;
  priority: string;
  changefreq: string;
}

interface PageSEO {
  id: string; label: string; path: string;
  title: string; description: string;
  og_title: string; og_description: string; og_image: string;
  twitter_title: string; twitter_description: string; twitter_image: string;
  twitter_card_type: string;
  canonical: string; robots: string;
  robots_advanced: string[];
  schema_enabled: boolean;
  schema_type: string;
  breadcrumb_title: string;
  focus_keyword: string;
  keyword_synonyms: string;
  is_cornerstone: boolean;
  article_type: string;
  noindex_reasons: string;
}

interface SiteSettings {
  site_name: string; title_separator: string; default_og_image: string;
  twitter_handle: string; site_url: string;
  google_verification: string; bing_verification: string;
  pinterest_verification: string; yandex_verification: string;
  organization_name: string; organization_logo: string; organization_url: string;
  organization_type: string;
  local_business_name: string; local_business_street: string;
  local_business_city: string; local_business_state: string;
  local_business_zip: string; local_business_country: string;
  local_business_phone: string; local_business_email: string;
  local_business_price_range: string;
  sitemap_posts_per_page: string;
  default_article_type: string;
  disable_date_archives: boolean;
  breadcrumbs_enabled: boolean;
  breadcrumb_separator: string;
  breadcrumb_home_label: string;
  search_console_connected: boolean;
}

/* ============================================================
   CONSTANTS
   ============================================================ */
const PAGES: { id:string; label:string; path:string; icon:LucideIcon; defaultTitle:string; defaultDesc:string }[] = [
  { id:"home",        label:"Homepage",    path:"/",            icon:Home,         defaultTitle:"Custom Print-on-Demand Apparel & Gifts | Veliova",              defaultDesc:"Shop unique artist-designed graphic tees, hoodies, mugs & gifts at Veliova. Free shipping on orders $50+." },
  { id:"shop",        label:"Shop",        path:"/shop",        icon:ShoppingBag,  defaultTitle:"Shop Custom Graphic Tees, Hoodies & Gifts | Veliova",           defaultDesc:"Browse Veliova full catalog: graphic tees, hoodies, mugs, posters & more. Free US shipping on orders $50+." },
  { id:"collections", label:"Collections", path:"/collections", icon:Package,      defaultTitle:"Curated Collections — Streetwear, Gifts | Veliova",             defaultDesc:"Explore Veliova curated collections: Bestsellers, Streetwear, Eco-friendly & Gift sets. Shipped across the USA." },
  { id:"about",       label:"About",       path:"/about",       icon:Info,         defaultTitle:"About Veliova — Artist-Designed Custom Apparel & Gifts",        defaultDesc:"Veliova is an independent artist-run print-on-demand store. Unique graphic tees & gifts — printed on demand, fulfilled by Printful." },
  { id:"cart",        label:"Cart",        path:"/cart",        icon:ShoppingCart, defaultTitle:"Your Cart | Veliova",                                            defaultDesc:"Review your Veliova order before checkout." },
  { id:"checkout",    label:"Checkout",    path:"/checkout",    icon:CreditCard,   defaultTitle:"Secure Checkout | Veliova",                                     defaultDesc:"Complete your Veliova order securely." },
];

const ROBOTS_OPTIONS = [
  { value:"index,follow",     label:"Index, Follow — recommended for public pages" },
  { value:"noindex,follow",   label:"No Index, Follow — hide from Google" },
  { value:"index,nofollow",   label:"Index, No Follow" },
  { value:"noindex,nofollow", label:"No Index, No Follow — fully private" },
];

const ROBOTS_ADVANCED_OPTIONS = [
  { value:"noarchive",       label:"No Archive — prevent Google from showing cached version" },
  { value:"noimageindex",    label:"No Image Index — prevent indexing of images on this page" },
  { value:"nosnippet",       label:"No Snippet — prevent description snippets in search results" },
  { value:"max-snippet:-1",  label:"Max Snippet: Unlimited" },
  { value:"max-video-preview:-1", label:"Max Video Preview: Unlimited" },
  { value:"max-image-preview:large", label:"Max Image Preview: Large" },
];

const SEPARATORS = [" | ", " — ", " · ", " - ", " » ", " • "];

const SCHEMA_TYPES = [
  "WebPage", "AboutPage", "ContactPage", "CollectionPage",
  "ItemPage", "CheckoutPage", "Product", "Organization",
];

const CHANGEFREQ_OPTIONS = ["always","hourly","daily","weekly","monthly","yearly","never"];
const PRIORITY_OPTIONS = ["1.0","0.9","0.8","0.7","0.6","0.5","0.4","0.3","0.2","0.1","0.0"];

function emptyPage(p: typeof PAGES[0]): PageSEO {
  return {
    id:p.id, label:p.label, path:p.path,
    title:p.defaultTitle, description:p.defaultDesc,
    og_title:p.defaultTitle, og_description:p.defaultDesc, og_image:"",
    twitter_title:p.defaultTitle, twitter_description:p.defaultDesc, twitter_image:"",
    twitter_card_type:"summary_large_image",
    canonical:`https://veliova.com${p.path}`, robots:"index,follow",
    robots_advanced:[], schema_enabled:true, schema_type:"WebPage",
    breadcrumb_title:p.label, focus_keyword:"", keyword_synonyms:"",
    is_cornerstone:false, article_type:"Article",
    noindex_reasons:"",
  };
}

const DEFAULT_SITE: SiteSettings = {
  site_name:"Veliova", title_separator:" | ", default_og_image:"",
  twitter_handle:"@veliova", site_url:"https://veliova.com",
  google_verification:"", bing_verification:"",
  pinterest_verification:"", yandex_verification:"",
  organization_name:"Veliova", organization_logo:"", organization_url:"https://veliova.com",
  organization_type:"OnlineStore",
  local_business_name:"", local_business_street:"", local_business_city:"",
  local_business_state:"", local_business_zip:"", local_business_country:"US",
  local_business_phone:"", local_business_email:"", local_business_price_range:"$$",
  sitemap_posts_per_page:"100",
  default_article_type:"Article",
  disable_date_archives:false,
  breadcrumbs_enabled:true,
  breadcrumb_separator:" > ",
  breadcrumb_home_label:"Home",
  search_console_connected:false,
};

/* ============================================================
   STYLE HELPERS
   ============================================================ */
const s = {
  card:     { background:"var(--bg-primary)", border:"1px solid var(--border)", borderRadius:16 } as React.CSSProperties,
  cardSm:   { background:"var(--bg-primary)", border:"1px solid var(--border)", borderRadius:12 } as React.CSSProperties,
  input:    { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg-secondary)", color:"var(--text-primary)", fontSize:13, outline:"none", boxSizing:"border-box" as const },
  textarea: { width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg-secondary)", color:"var(--text-primary)", fontSize:13, outline:"none", boxSizing:"border-box" as const, resize:"vertical" as const },
  select:   { padding:"7px 10px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg-secondary)", color:"var(--text-primary)", fontSize:12, outline:"none", cursor:"pointer" } as React.CSSProperties,
  label:    { display:"block", fontSize:11, fontWeight:600, textTransform:"uppercase" as const, letterSpacing:"0.05em", color:"var(--text-muted)", marginBottom:6 },
  hint:     { fontSize:11, color:"var(--text-muted)", marginTop:4 },
  badge:    (ok:boolean) => ({ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:999, background:ok?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", color:ok?"#22c55e":"#ef4444" } as React.CSSProperties),
  scoreColor: (n:number) => n>=70?"#22c55e":n>=40?"#f59e0b":"#ef4444",
};

/* ============================================================
   ANALYSIS ENGINE
   ============================================================ */
function analyzeSEO(page: PageSEO): { score:number; checks: {ok:boolean; label:string; tip:string}[] } {
  const kw = page.focus_keyword.toLowerCase().trim();
  const checks = [
    { ok: page.title.length>=30 && page.title.length<=60,    label:"Title length (30–60 chars)",       tip:"Your title is " + page.title.length + " chars. Aim for 30–60." },
    { ok: page.description.length>=120 && page.description.length<=160, label:"Description length (120–160 chars)", tip:"Your description is " + page.description.length + " chars. Aim for 120–160." },
    { ok: !!kw && page.title.toLowerCase().includes(kw),     label:"Focus keyword in SEO title",       tip:"Add the focus keyword to the title." },
    { ok: !!kw && page.description.toLowerCase().includes(kw), label:"Focus keyword in meta description", tip:"Add the focus keyword to the description." },
    { ok: !!kw && page.path.toLowerCase().replace(/-/g," ").includes(kw), label:"Focus keyword in URL", tip:"The URL slug should contain the focus keyword." },
    { ok: !!page.og_image,                                   label:"OG image set",                    tip:"Set an Open Graph image for social sharing." },
    { ok: !!page.canonical,                                  label:"Canonical URL set",               tip:"Set a canonical URL to avoid duplicate content." },
    { ok: !!page.breadcrumb_title,                           label:"Breadcrumb title set",             tip:"Set a custom breadcrumb title." },
    { ok: page.og_title.length>0 && page.og_title !== page.title, label:"OG title differs from SEO title", tip:"OG title can be slightly expanded vs SEO title." },
    { ok: page.schema_enabled,                               label:"Structured data enabled",          tip:"Enable schema markup for rich results." },
  ];
  const score = Math.round((checks.filter(c=>c.ok).length / checks.length) * 100);
  return { score, checks };
}

function analyzeReadability(text: string): { score:number; level:string } {
  if (!text) return { score:0, level:"Unknown" };
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const syllables = words.reduce((n,w)=>n+Math.max(1,(w.match(/[aeiouy]/gi)||[]).length),0);
  if (!sentences.length || !words.length) return { score:0, level:"Unknown" };
  const asl = words.length / sentences.length;
  const asw = syllables / words.length;
  const flesch = Math.round(206.835 - 1.015*asl - 84.6*asw);
  const score = Math.max(0, Math.min(100, flesch));
  const level = score>=90?"Very Easy":score>=80?"Easy":score>=70?"Fairly Easy":score>=60?"Standard":score>=50?"Fairly Difficult":score>=30?"Difficult":"Very Confusing";
  return { score, level };
}

function keywordDensity(text:string, kw:string): number {
  if (!kw || !text) return 0;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const kwWords = kw.toLowerCase().split(/\s+/);
  let count = 0;
  for (let i=0; i<=words.length-kwWords.length; i++) {
    if (kwWords.every((w,j)=>words[i+j]===w)) count++;
  }
  return words.length ? Math.round((count*kwWords.length/words.length)*1000)/10 : 0;
}

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */
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
      <span style={{ fontSize:11, color, fontWeight:len>max?700:400 }}>{len}/{max}</span>
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

function ScoreBadge({ score }: { score:number }) {
  const color = s.scoreColor(score);
  const label = score>=70?"Good":score>=40?"OK":"Needs Work";
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
      <svg width={36} height={36} viewBox="0 0 36 36">
        <circle cx={18} cy={18} r={14} fill="none" stroke="var(--bg-tertiary)" strokeWidth={4}/>
        <circle cx={18} cy={18} r={14} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${score*0.879} 100`} strokeLinecap="round" transform="rotate(-90 18 18)"
          style={{ transition:"stroke-dasharray 0.5s" }}/>
        <text x={18} y={22} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{score}</text>
      </svg>
      <div>
        <p style={{ fontSize:12, fontWeight:700, color, margin:0 }}>{label}</p>
        <p style={{ fontSize:10, color:"var(--text-muted)", margin:0 }}>SEO Score</p>
      </div>
    </div>
  );
}

function SerpPreview({ title, description, url, mode }: { title:string; description:string; url:string; mode:"desktop"|"mobile" }) {
  const t = title.length>60?title.slice(0,57)+"…":title;
  const d = description.length>160?description.slice(0,157)+"…":description;
  const b = url.replace(/https?:\/\//,"");
  return (
    <div style={{ ...s.card, padding: mode==="mobile"?16:20, maxWidth:mode==="mobile"?340:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
        <div style={{ width:16, height:16, borderRadius:mode==="mobile"?999:4, background:"var(--bg-tertiary)" }} />
        {mode==="desktop" && (
          <div>
            <p style={{ fontSize:12, color:"var(--text-primary)", margin:0 }}>Veliova</p>
            <p style={{ fontSize:11, color:"var(--text-muted)", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:400 }}>{b}</p>
          </div>
        )}
        {mode==="mobile" && <span style={{ fontSize:11, color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b}</span>}
      </div>
      <p style={{ fontSize:mode==="mobile"?13:17, color:"#60a5fa", margin:"0 0 4px", lineHeight:1.4 }}>{t||"Page title"}</p>
      <p style={{ fontSize:12, color:"var(--text-secondary)", margin:0, lineHeight:1.5 }}>{d||"Page description"}</p>
    </div>
  );
}

function SocialCard({ title, description, image, domain }: { title:string; description:string; image:string; domain?:string }) {
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
        <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-muted)", margin:"0 0 3px" }}>{domain||"veliova.com"}</p>
        <p style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", margin:"0 0 2px", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{title||"Page title"}</p>
        <p style={{ fontSize:11, color:"var(--text-secondary)", margin:0, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" } as React.CSSProperties}>{description||"Page description"}</p>
      </div>
    </div>
  );
}

function Accordion({ label, icon:Icon, open, onToggle, children, badge }: { label:string; icon:LucideIcon; open:boolean; onToggle:()=>void; children:React.ReactNode; badge?:React.ReactNode }) {
  return (
    <div style={{ ...s.card, overflow:"hidden" }}>
      <button onClick={onToggle} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", background:"none", border:"none", cursor:"pointer", color:"var(--text-primary)", fontSize:13, fontWeight:600 }}>
        <span style={{ display:"flex", alignItems:"center", gap:8 }}><Icon size={14} color="var(--accent)"/>{label}{badge}</span>
        <ChevronDown size={14} color="var(--text-muted)" style={{ transform:open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}/>
      </button>
      {open && <div style={{ padding:"0 20px 20px", borderTop:"1px solid var(--border)" }}><div style={{ height:16 }}/>{children}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children:React.ReactNode }) {
  return <h3 style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--text-muted)", margin:"0 0 12px" }}>{children}</h3>;
}

function Divider() {
  return <div style={{ height:1, background:"var(--border)", margin:"16px 0" }} />;
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function SeoSettingsPage() {
  const [pages, setPages]           = useState<PageSEO[]>(PAGES.map(emptyPage));
  const [site, setSite]             = useState<SiteSettings>(DEFAULT_SITE);
  const [redirects, setRedirects]   = useState<RedirectRule[]>([]);
  const [sitemap, setSitemap]       = useState<SitemapEntry[]>(PAGES.map(p=>({ pageId:p.id, include:true, priority:p.id==="home"?"1.0":"0.8", changefreq:"weekly" })));
  const [activeTab, setActiveTab]   = useState("analyze");
  const [activePage, setActivePage] = useState("home");
  const [serpMode, setSerpMode]     = useState<"desktop"|"mobile">("desktop");
  const [socialNet, setSocialNet]   = useState<"facebook"|"twitter">("facebook");
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [msg, setMsg]               = useState<{type:"success"|"error";text:string}|null>(null);
  const [openAcc, setOpenAcc]       = useState<string[]>(["basic","og"]);
  const [newRedirectFrom, setNewRedirectFrom] = useState("");
  const [newRedirectTo, setNewRedirectTo]     = useState("");
  const [newRedirectType, setNewRedirectType] = useState<"301"|"302">("301");
  const [copiedId, setCopiedId]     = useState("");

  const toggleAcc = (id:string) => setOpenAcc(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/seo-settings");
        const json = await res.json();
        if (json.settings?.length) {
          const siteRow = json.settings.find((r:{id:string})=>r.id==="__site__");
          if (siteRow) setSite({...DEFAULT_SITE,...siteRow});
          const rows: PageSEO[] = json.settings.filter((r:{id:string})=>!r.id.startsWith("__"));
          setPages(PAGES.map(p=>{ const saved=rows.find(r=>r.id===p.id); return saved?{...emptyPage(p),...saved}:emptyPage(p); }));
          const sitemapRow = json.settings.find((r:{id:string})=>r.id==="__sitemap__");
          if (sitemapRow?.entries) setSitemap(sitemapRow.entries);
          const redirectsRow = json.settings.find((r:{id:string})=>r.id==="__redirects__");
          if (redirectsRow?.rules) setRedirects(redirectsRow.rules);
        }
      } catch { /* use defaults */ }
      setLoading(false);
    })();
  }, []);

  const cur = pages.find(p=>p.id===activePage)??pages[0];
  const upd = (key:keyof PageSEO, val:string|boolean|string[]) => setPages(ps=>ps.map(p=>p.id===activePage?{...p,[key]:val}:p));
  const updSite = (key:keyof SiteSettings, val:string|boolean) => setSite(s=>({...s,[key]:val}));
  const { score: seoScore, checks: seoChecks } = analyzeSEO(cur);
  const readability = analyzeReadability(cur.description);
  const kwDensity = keywordDensity(cur.title + " " + cur.description, cur.focus_keyword);

  const save = useCallback(async () => {
    setSaving(true); setMsg(null);
    try {
      await fetch("/api/seo-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:"__site__",...site})});
      await Promise.all(pages.map(p=>fetch("/api/seo-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)})));
      await fetch("/api/seo-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:"__sitemap__",entries:sitemap})});
      await fetch("/api/seo-settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:"__redirects__",rules:redirects})});
      setMsg({type:"success",text:"All SEO settings saved successfully!"});
    } catch(e) { setMsg({type:"error",text:`Save failed: ${(e as Error).message}`}); }
    setSaving(false);
    setTimeout(()=>setMsg(null),6000);
  },[pages,site,sitemap,redirects]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, gap:12, color:"var(--text-muted)" }}>
      <Loader2 size={20} style={{ animation:"spin 1s linear infinite" }}/> Loading SEO settings…
    </div>
  );

  const TABS = [
    { id:"analyze",  label:"SEO Analysis",     icon:Activity },
    { id:"pages",    label:"Page SEO",          icon:FileSearch },
    { id:"social",   label:"Social / OG",       icon:Share2 },
    { id:"schema",   label:"Schema / JSON-LD",  icon:Code2 },
    { id:"robots",   label:"Indexing",          icon:ShieldCheck },
    { id:"sitemap",  label:"Sitemap",           icon:Map },
    { id:"redirects",label:"Redirects",         icon:ExternalLink },
    { id:"site",     label:"Site Settings",     icon:Settings },
  ];

  const pageAnalyses = pages.map(p=>({ ...p, ...analyzeSEO(p) }));
  const overallScore = Math.round(pageAnalyses.reduce((a,p)=>a+p.score,0)/pageAnalyses.length);

  return (
    <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 16px 100px" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:"var(--text-primary)", margin:0 }}>SEO Center</h1>
          <p style={{ fontSize:13, color:"var(--text-secondary)", marginTop:4, marginBottom:0 }}>Full SEO control — titles, keywords, schema, sitemaps, redirects, social cards & more.</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 16px", borderRadius:10, border:"1px solid var(--border)", background:"var(--bg-primary)" }}>
            <span style={{ fontSize:18, fontWeight:800, color:s.scoreColor(overallScore) }}>{overallScore}</span>
            <span style={{ fontSize:10, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.05em" }}>Overall</span>
          </div>
          <button onClick={save} disabled={saving} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 22px", borderRadius:10, background:"#ea580c", color:"#fff", fontSize:13, fontWeight:700, border:"none", cursor:saving?"not-allowed":"pointer", opacity:saving?0.6:1 }}>
            {saving?<Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/>:<Save size={14}/>}
            {saving?"Saving…":"Save All"}
          </button>
        </div>
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
          <button key={id} onClick={()=>setActiveTab(id)} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:500, whiteSpace:"nowrap", border:"none", cursor:"pointer", transition:"all 0.15s", background:activeTab===id?"var(--bg-primary)":"transparent", color:activeTab===id?"var(--text-primary)":"var(--text-muted)", boxShadow:activeTab===id?"0 1px 3px rgba(0,0,0,0.1)":"none" }}>
            <Icon size={12}/>{label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════
          TAB: SEO ANALYSIS
          ════════════════════════════════ */}
      {activeTab==="analyze" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Overall score card */}
          <div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))" }}>
            <div style={{ ...s.card, padding:20, gridColumn:"1/-1" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
                <h2 style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)", margin:0, display:"flex", alignItems:"center", gap:8 }}><Activity size={14} color="#ea580c"/>SEO Health Overview</h2>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ fontSize:12, color:"var(--text-muted)" }}>{pageAnalyses.filter(p=>p.score>=70).length} Good &nbsp;·&nbsp; {pageAnalyses.filter(p=>p.score>=40&&p.score<70).length} OK &nbsp;·&nbsp; {pageAnalyses.filter(p=>p.score<40).length} Needs Work</span>
                </div>
              </div>
              <div style={{ display:"grid", gap:10 }}>
                {pageAnalyses.map(p=>{
                  const color = s.scoreColor(p.score);
                  const pg = PAGES.find(x=>x.id===p.id)!;
                  return (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, background:"var(--bg-secondary)", cursor:"pointer" }}
                      onClick={()=>{ setActivePage(p.id); setActiveTab("pages"); }}>
                      <pg.icon size={13} color="var(--text-muted)"/>
                      <span style={{ flex:1, fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{p.label}</span>
                      <span style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"monospace" }}>{p.path}</span>
                      <div style={{ width:120, height:6, borderRadius:99, background:"var(--bg-tertiary)", overflow:"hidden" }}>
                        <div style={{ width:`${p.score}%`, height:"100%", background:color, borderRadius:99, transition:"width 0.4s" }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color, minWidth:32, textAlign:"right" }}>{p.score}%</span>
                      <span style={{ fontSize:11, color:"var(--text-muted)" }}>{p.score>=70?"Good":p.score>=40?"OK":"Fix"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick tips */}
            <div style={{ ...s.card, padding:20, gridColumn:"1/-1" }}>
              <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}><Zap size={14} color="#f59e0b"/>Quick Wins — Top Issues to Fix</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {pageAnalyses.flatMap(p=>p.checks.filter(c=>!c.ok).map(c=>({...c, page:p.label}))).slice(0,8).map((c,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.15)" }}>
                    <AlertCircle size={13} color="#ef4444" style={{ flexShrink:0, marginTop:2 }}/>
                    <div>
                      <span style={{ fontSize:12, fontWeight:600, color:"var(--text-primary)" }}>{c.page}: </span>
                      <span style={{ fontSize:12, color:"var(--text-secondary)" }}>{c.tip}</span>
                    </div>
                  </div>
                ))}
                {pageAnalyses.flatMap(p=>p.checks.filter(c=>!c.ok)).length===0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px", color:"#22c55e", fontSize:13 }}>
                    <CheckCircle2 size={16}/> All pages pass basic SEO checks!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: PAGE SEO
          ════════════════════════════════ */}
      {activeTab==="pages" && (
        <div style={{ display:"grid", gridTemplateColumns:"210px 1fr", gap:20, alignItems:"start" }}>
          {/* Page list */}
          <div style={{ ...s.card, padding:8, position:"sticky", top:16 }}>
            <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text-muted)", padding:"4px 12px 8px", margin:0 }}>Pages</p>
            {PAGES.map(p=>{
              const analysis = pageAnalyses.find(x=>x.id===p.id)!;
              const active = activePage===p.id;
              const color = s.scoreColor(analysis.score);
              return (
                <button key={p.id} onClick={()=>setActivePage(p.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, textAlign:"left", border:"none", cursor:"pointer", background:active?"rgba(234,88,12,0.08)":"transparent", color:active?"#ea580c":"var(--text-secondary)", fontWeight:active?600:400, fontSize:13 }}>
                  <p.icon size={12}/>
                  <span style={{ flex:1 }}>{p.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color }}>{analysis.score}%</span>
                </button>
              );
            })}
          </div>

          {/* Editor */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Score + keyword summary bar */}
            <div style={{ ...s.card, padding:16, display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <ScoreBadge score={seoScore}/>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {seoChecks.map((c,i)=>(
                    <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, color:c.ok?"#22c55e":"#ef4444" }}>
                      {c.ok?<CheckCircle2 size={10}/>:<AlertCircle size={10}/>}{c.label}
                    </span>
                  ))}
                </div>
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"var(--text-secondary)" }}>
                <input type="checkbox" checked={cur.is_cornerstone} onChange={e=>upd("is_cornerstone",e.target.checked)} style={{ accentColor:"#ea580c" }}/>
                <Star size={13} color={cur.is_cornerstone?"#f59e0b":"var(--text-muted)"}/> Cornerstone Content
              </label>
            </div>

            {/* SERP Preview */}
            <div style={{ ...s.card, padding:18 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:0, display:"flex", alignItems:"center", gap:8 }}><Search size={13} color="#ea580c"/>Google SERP Preview</h3>
                <div style={{ display:"flex", gap:4 }}>
                  {(["desktop","mobile"] as const).map(m=>(
                    <button key={m} onClick={()=>setSerpMode(m)} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderRadius:7, fontSize:11, border:"none", cursor:"pointer", background:serpMode===m?"var(--text-primary)":"var(--bg-tertiary)", color:serpMode===m?"var(--bg-primary)":"var(--text-muted)" }}>
                      {m==="desktop"?<Monitor size={11}/>:<Smartphone size={11}/>}{m}
                    </button>
                  ))}
                </div>
              </div>
              <SerpPreview title={cur.title} description={cur.description} url={cur.canonical||`https://veliova.com${cur.path}`} mode={serpMode}/>
            </div>

            {/* Focus Keyword */}
            <Accordion label="Focus Keyword & Analysis" icon={Target} open={openAcc.includes("kw")} onToggle={()=>toggleAcc("kw")}>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Focus Keyword" hint="The main keyword you want this page to rank for">
                    <input style={s.input} type="text" value={cur.focus_keyword} onChange={e=>upd("focus_keyword",e.target.value)} placeholder="e.g. retro graphic tees"/>
                  </Field>
                  <Field label="Keyword Synonyms" hint="Comma-separated related phrases">
                    <input style={s.input} type="text" value={cur.keyword_synonyms} onChange={e=>upd("keyword_synonyms",e.target.value)} placeholder="e.g. vintage tees, graphic shirts"/>
                  </Field>
                </div>
                {cur.focus_keyword && (
                  <div style={{ background:"var(--bg-secondary)", borderRadius:10, padding:14 }}>
                    <SectionTitle>Keyword Analysis</SectionTitle>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10 }}>
                      {[
                        { label:"Keyword Density", value:`${kwDensity}%`, ok:kwDensity>=0.5&&kwDensity<=2.5, tip:"Aim for 0.5%–2.5%" },
                        { label:"In SEO Title",    value:cur.title.toLowerCase().includes(cur.focus_keyword.toLowerCase())?"Yes":"No", ok:cur.title.toLowerCase().includes(cur.focus_keyword.toLowerCase()), tip:"" },
                        { label:"In Description",  value:cur.description.toLowerCase().includes(cur.focus_keyword.toLowerCase())?"Yes":"No", ok:cur.description.toLowerCase().includes(cur.focus_keyword.toLowerCase()), tip:"" },
                        { label:"In URL",          value:cur.path.toLowerCase().includes(cur.focus_keyword.toLowerCase().replace(/\s+/g,"-"))?"Yes":"No", ok:cur.path.toLowerCase().includes(cur.focus_keyword.toLowerCase().replace(/\s+/g,"-")), tip:"" },
                        { label:"Readability",     value:readability.level, ok:readability.score>=60, tip:`Score: ${readability.score}/100` },
                      ].map(({label,value,ok,tip})=>(
                        <div key={label} style={{ padding:"10px 12px", borderRadius:8, background:"var(--bg-primary)", border:"1px solid var(--border)", textAlign:"center" }}>
                          <p style={{ fontSize:10, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px" }}>{label}</p>
                          <p style={{ fontSize:16, fontWeight:700, color:s.scoreColor(ok?100:0), margin:"0 0 2px" }}>{value}</p>
                          {tip && <p style={{ fontSize:10, color:"var(--text-muted)", margin:0 }}>{tip}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Accordion>

            {/* Basic SEO */}
            <Accordion label="Basic SEO — Title & Description" icon={Search} open={openAcc.includes("basic")} onToggle={()=>toggleAcc("basic")}>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Field label="SEO Title" hint="Optimal: 50–60 characters. Put focus keyword first.">
                  <input style={s.input} type="text" value={cur.title} onChange={e=>upd("title",e.target.value)} placeholder="Page Title | Veliova"/>
                  <CharCount val={cur.title} max={60} warn={50}/>
                </Field>
                <Field label="Meta Description" hint="Optimal: 120–160 characters. Include focus keyword + CTA.">
                  <textarea style={s.textarea} rows={3} value={cur.description} onChange={e=>upd("description",e.target.value)} placeholder="Describe the page with primary keyword + CTA."/>
                  <CharCount val={cur.description} max={160} warn={140}/>
                </Field>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Canonical URL">
                    <div style={{ position:"relative" }}>
                      <Link2 size={12} color="var(--text-muted)" style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}/>
                      <input style={{ ...s.input, paddingLeft:30 }} type="url" value={cur.canonical} onChange={e=>upd("canonical",e.target.value)} placeholder={`https://veliova.com${cur.path}`}/>
                    </div>
                  </Field>
                  <Field label="Breadcrumb Title" hint="Displayed in breadcrumb navigation">
                    <input style={s.input} type="text" value={cur.breadcrumb_title} onChange={e=>upd("breadcrumb_title",e.target.value)} placeholder={cur.label}/>
                  </Field>
                </div>
              </div>
            </Accordion>

            {/* Open Graph */}
            <Accordion label="Open Graph — Facebook & LinkedIn" icon={Share2} open={openAcc.includes("og")} onToggle={()=>toggleAcc("og")}>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <Field label="OG Title">
                      <input style={s.input} type="text" value={cur.og_title} onChange={e=>upd("og_title",e.target.value)} placeholder="Same as SEO title or expanded"/>
                      <CharCount val={cur.og_title} max={90} warn={70}/>
                    </Field>
                  </div>
                  <div>
                    <Field label="OG Description">
                      <input style={s.input} type="text" value={cur.og_description} onChange={e=>upd("og_description",e.target.value)} placeholder="Same as meta description"/>
                      <CharCount val={cur.og_description} max={200} warn={160}/>
                    </Field>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="OG Image URL — 1200×630px">
                    <input style={s.input} type="url" value={cur.og_image} onChange={e=>upd("og_image",e.target.value)} placeholder="https://veliova.com/og/page.jpg"/>
                  </Field>
                  <Field label="Article Type">
                    <select style={{ ...s.select, width:"100%" }} value={cur.article_type} onChange={e=>upd("article_type",e.target.value)}>
                      {["Article","BlogPosting","NewsArticle","Product","Website"].map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <div>
                  <p style={{ ...s.label, marginBottom:8 }}>Facebook / LinkedIn Preview</p>
                  <SocialCard title={cur.og_title||cur.title} description={cur.og_description||cur.description} image={cur.og_image}/>
                </div>
              </div>
            </Accordion>

            {/* Twitter */}
            <Accordion label="Twitter / X Card" icon={MessageCircle} open={openAcc.includes("twitter")} onToggle={()=>toggleAcc("twitter")}>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <Field label="Twitter Title">
                      <input style={s.input} type="text" value={cur.twitter_title} onChange={e=>upd("twitter_title",e.target.value)} placeholder="Same as SEO title"/>
                      <CharCount val={cur.twitter_title} max={70} warn={60}/>
                    </Field>
                  </div>
                  <div>
                    <Field label="Twitter Description">
                      <input style={s.input} type="text" value={cur.twitter_description} onChange={e=>upd("twitter_description",e.target.value)} placeholder="Same as meta description"/>
                      <CharCount val={cur.twitter_description} max={200} warn={160}/>
                    </Field>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Twitter Image — 1200×628px">
                    <input style={s.input} type="url" value={cur.twitter_image} onChange={e=>upd("twitter_image",e.target.value)} placeholder="https://veliova.com/og/page.jpg"/>
                  </Field>
                  <Field label="Card Type">
                    <select style={{ ...s.select, width:"100%" }} value={cur.twitter_card_type} onChange={e=>upd("twitter_card_type",e.target.value)}>
                      <option value="summary_large_image">Summary Large Image</option>
                      <option value="summary">Summary (small image)</option>
                      <option value="app">App Card</option>
                      <option value="player">Player Card</option>
                    </select>
                  </Field>
                </div>
                <SocialCard title={cur.twitter_title||cur.title} description={cur.twitter_description||cur.description} image={cur.twitter_image||cur.og_image} domain="VELIOVA.COM"/>
              </div>
            </Accordion>

            {/* Advanced Robots */}
            <Accordion label="Advanced Indexing Controls" icon={ShieldCheck} open={openAcc.includes("adv")} onToggle={()=>toggleAcc("adv")}>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Field label="Robots Directive">
                  <select style={{ ...s.select, width:"100%" }} value={cur.robots} onChange={e=>upd("robots",e.target.value)}>
                    {ROBOTS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <div>
                  <span style={s.label}>Advanced Robots Tags</span>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {ROBOTS_ADVANCED_OPTIONS.map(o=>(
                      <label key={o.value} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--text-secondary)", cursor:"pointer" }}>
                        <input type="checkbox" checked={(cur.robots_advanced||[]).includes(o.value)}
                          onChange={e=>{
                            const prev = cur.robots_advanced||[];
                            upd("robots_advanced", e.target.checked ? [...prev,o.value] : prev.filter((x:string)=>x!==o.value));
                          }}
                          style={{ accentColor:"#ea580c" }}/>
                        <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{o.value}</span>
                        <span style={{ color:"var(--text-muted)" }}>— {o.label.split("—")[1]?.trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="Reason for No-Index (internal notes)" hint="For your records only — not published">
                  <input style={s.input} type="text" value={cur.noindex_reasons||""} onChange={e=>upd("noindex_reasons",e.target.value)} placeholder="e.g. Staging page, thin content"/>
                </Field>
              </div>
            </Accordion>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: SOCIAL / OG
          ════════════════════════════════ */}
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

      {/* ════════════════════════════════
          TAB: SCHEMA / JSON-LD
          ════════════════════════════════ */}
      {activeTab==="schema" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 4px", display:"flex", alignItems:"center", gap:8 }}><Code2 size={14} color="#ea580c"/>Per-Page Schema Type</h2>
            <p style={{ fontSize:12, color:"var(--text-muted)", margin:"0 0 16px" }}>Choose the schema type for each page. This controls what rich results Google can show.</p>
            <div>
              {PAGES.map((p,i)=>{
                const pg = pages.find(x=>x.id===p.id)!;
                return (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:i<PAGES.length-1?"1px solid var(--border)":"none", flexWrap:"wrap" }}>
                    <p.icon size={13} color="var(--text-muted)" style={{ flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:500, color:"var(--text-primary)", margin:0 }}>{p.label}</p>
                      <p style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"monospace", margin:"2px 0 0" }}>{p.path}</p>
                    </div>
                    <select
                      value={pg.schema_type}
                      onChange={e=>setPages(ps=>ps.map(x=>x.id===p.id?{...x,schema_type:e.target.value}:x))}
                      style={s.select}>
                      {SCHEMA_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={()=>setPages(ps=>ps.map(x=>x.id===p.id?{...x,schema_enabled:!x.schema_enabled}:x))}
                      style={{ position:"relative", width:44, height:24, borderRadius:999, border:"none", cursor:"pointer", background:pg.schema_enabled?"#ea580c":"var(--bg-tertiary)", transition:"background 0.2s", flexShrink:0 }}>
                      <span style={{ position:"absolute", top:2, left:2, width:20, height:20, borderRadius:999, background:"white", boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transform:pg.schema_enabled?"translateX(20px)":"translateX(0)", transition:"transform 0.2s" }}/>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}><Layers size={14} color="#ea580c"/>Global Schema Types (Auto-Applied)</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { name:"Organization",    desc:"Site-wide brand schema — helps Google Knowledge Panel",         status:"active" },
                { name:"OnlineStore",     desc:"Marks site as an e-commerce store",                            status:"active" },
                { name:"WebSite",         desc:"Enables Sitelinks Searchbox in Google results",                status:"active" },
                { name:"Product",         desc:"Price, availability, reviews on all product pages",            status:"active" },
                { name:"BreadcrumbList",  desc:"Navigation breadcrumbs shown in search result URLs",           status:"active" },
                { name:"FAQPage",         desc:"FAQ rich results — Q&A shown directly in Google search",       status:"active" },
                { name:"LocalBusiness",   desc:"Local business info (requires address in Site Settings)",      status:site.local_business_name?"active":"inactive" },
                { name:"AggregateRating", desc:"Star ratings in search results (requires review integration)", status:"manual" },
              ].map(({name,desc,status})=>(
                <div key={name} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", borderRadius:10, background:status==="active"?"rgba(34,197,94,0.06)":status==="manual"?"rgba(245,158,11,0.06)":"rgba(0,0,0,0.03)", border:`1px solid ${status==="active"?"rgba(34,197,94,0.2)":status==="manual"?"rgba(245,158,11,0.2)":"var(--border)"}` }}>
                  <CheckCircle2 size={13} color={status==="active"?"#22c55e":status==="manual"?"#f59e0b":"var(--text-muted)"} style={{ flexShrink:0, marginTop:1 }}/>
                  <div>
                    <span style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)" }}>{name}</span>
                    <span style={{ fontSize:11, color:"var(--text-secondary)", marginLeft:8 }}>{desc}</span>
                    {status==="inactive" && <span style={{ fontSize:10, color:"#f59e0b", marginLeft:8, fontWeight:600 }}>— needs address in Site Settings</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: INDEXING
          ════════════════════════════════ */}
      {activeTab==="robots" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px", borderRadius:12, background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.3)", fontSize:13, color:"var(--text-secondary)" }}>
            <AlertCircle size={15} color="#f59e0b" style={{ flexShrink:0, marginTop:1 }}/>
            <div><strong style={{ color:"var(--text-primary)" }}>Indexing controls</strong> — "No Index" removes a page from Google. Only block pages you truly want hidden.</div>
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
                  {(pg.robots_advanced||[]).length>0 && (
                    <p style={{ fontSize:10, color:"var(--text-muted)", margin:"3px 0 0" }}>Advanced: {pg.robots_advanced.join(", ")}</p>
                  )}
                </div>
                <span style={s.badge(indexed)}>{indexed?<Eye size={10}/>:<EyeOff size={10}/>}{indexed?"Indexed":"No Index"}</span>
                <select value={pg.robots} onChange={e=>setPages(ps=>ps.map(x=>x.id===p.id?{...x,robots:e.target.value}:x))} style={s.select}>
                  {ROBOTS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            );
          })}

          <Divider/>
          <div style={{ ...s.card, padding:20 }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}><FileText size={13} color="#ea580c"/>robots.txt Preview</h3>
            <pre style={{ fontSize:11, color:"var(--text-secondary)", background:"var(--bg-secondary)", padding:14, borderRadius:8, border:"1px solid var(--border)", margin:0, overflowX:"auto", lineHeight:1.7 }}>
{`User-agent: *
Allow: /
${pages.filter(p=>p.robots.startsWith("noindex")).map(p=>`Disallow: ${p.path}`).join("\n")}

Sitemap: ${site.site_url}/sitemap.xml`}
            </pre>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: SITEMAP
          ════════════════════════════════ */}
      {activeTab==="sitemap" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ ...s.card, padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:0, display:"flex", alignItems:"center", gap:8 }}><Map size={14} color="#ea580c"/>XML Sitemap Configuration</h2>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:12, color:"var(--text-muted)" }}>Sitemap URL:</span>
                <code style={{ fontSize:11, color:"#60a5fa", background:"var(--bg-secondary)", padding:"3px 8px", borderRadius:6 }}>{site.site_url}/sitemap.xml</code>
              </div>
            </div>
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"auto 1fr 120px 120px auto", gap:0, borderRadius:8, overflow:"hidden", border:"1px solid var(--border)" }}>
                <div style={{ display:"contents" }}>
                  {["Include","Page","Priority","Change Freq",""].map((h,i)=>(
                    <div key={i} style={{ padding:"8px 12px", background:"var(--bg-tertiary)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--text-muted)", borderBottom:"1px solid var(--border)" }}>{h}</div>
                  ))}
                </div>
                {PAGES.map((p,i)=>{
                  const entry = sitemap.find(x=>x.pageId===p.id) ?? { pageId:p.id, include:true, priority:"0.8", changefreq:"weekly" };
                  return (
                    <div key={p.id} style={{ display:"contents" }}>
                      <div style={{ padding:"10px 12px", borderBottom:i<PAGES.length-1?"1px solid var(--border)":"none", display:"flex", alignItems:"center" }}>
                        <input type="checkbox" checked={entry.include}
                          onChange={e=>setSitemap(sm=>sm.map(x=>x.pageId===p.id?{...x,include:e.target.checked}:x))}
                          style={{ accentColor:"#ea580c" }}/>
                      </div>
                      <div style={{ padding:"10px 12px", borderBottom:i<PAGES.length-1?"1px solid var(--border)":"none", display:"flex", alignItems:"center", gap:8 }}>
                        <p.icon size={12} color="var(--text-muted)"/>
                        <span style={{ fontSize:13, color:"var(--text-primary)" }}>{p.label}</span>
                        <span style={{ fontSize:11, color:"var(--text-muted)", fontFamily:"monospace" }}>{p.path}</span>
                      </div>
                      <div style={{ padding:"10px 8px", borderBottom:i<PAGES.length-1?"1px solid var(--border)":"none" }}>
                        <select value={entry.priority} onChange={e=>setSitemap(sm=>sm.map(x=>x.pageId===p.id?{...x,priority:e.target.value}:x))} style={{ ...s.select, width:"100%", fontSize:12 }}>
                          {PRIORITY_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div style={{ padding:"10px 8px", borderBottom:i<PAGES.length-1?"1px solid var(--border)":"none" }}>
                        <select value={entry.changefreq} onChange={e=>setSitemap(sm=>sm.map(x=>x.pageId===p.id?{...x,changefreq:e.target.value}:x))} style={{ ...s.select, width:"100%", fontSize:12 }}>
                          {CHANGEFREQ_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div style={{ padding:"10px 8px", borderBottom:i<PAGES.length-1?"1px solid var(--border)":"none", display:"flex", alignItems:"center" }}>
                        <span style={s.badge(entry.include)}>{entry.include?"In":"Out"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ ...s.card, padding:20 }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 12px", display:"flex", alignItems:"center", gap:8 }}><FileText size={13} color="#ea580c"/>Sitemap Preview (XML)</h3>
            <pre style={{ fontSize:10, color:"var(--text-secondary)", background:"var(--bg-secondary)", padding:14, borderRadius:8, border:"1px solid var(--border)", margin:0, overflowX:"auto", lineHeight:1.8, maxHeight:220, overflowY:"auto" }}>
{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.filter(e=>e.include).map(e=>{
  const pg=PAGES.find(p=>p.id===e.pageId);
  return `  <url>
    <loc>${site.site_url}${pg?.path}</loc>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`;
}).join("\n")}
</urlset>`}
            </pre>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: REDIRECTS
          ════════════════════════════════ */}
      {activeTab==="redirects" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}><ExternalLink size={14} color="#ea580c"/>Redirect Manager</h2>
            <p style={{ fontSize:12, color:"var(--text-muted)", margin:"0 0 16px" }}>301 redirects preserve SEO juice. 302 are temporary. Avoid redirect chains.</p>

            {/* Add new */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto auto", gap:8, marginBottom:16, alignItems:"end" }}>
              <Field label="From (old URL path)">
                <input style={s.input} type="text" value={newRedirectFrom} onChange={e=>setNewRedirectFrom(e.target.value)} placeholder="/old-page"/>
              </Field>
              <Field label="To (new URL)">
                <input style={s.input} type="text" value={newRedirectTo} onChange={e=>setNewRedirectTo(e.target.value)} placeholder="/new-page or https://..."/>
              </Field>
              <div>
                <span style={s.label}>Type</span>
                <select style={s.select} value={newRedirectType} onChange={e=>setNewRedirectType(e.target.value as "301"|"302")}>
                  <option value="301">301 Permanent</option>
                  <option value="302">302 Temporary</option>
                </select>
              </div>
              <button
                onClick={()=>{
                  if (!newRedirectFrom||!newRedirectTo) return;
                  setRedirects(r=>[...r,{ id:Date.now().toString(), from:newRedirectFrom, to:newRedirectTo, type:newRedirectType }]);
                  setNewRedirectFrom(""); setNewRedirectTo("");
                }}
                style={{ padding:"8px 16px", borderRadius:8, background:"#ea580c", color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:6, alignSelf:"flex-end" }}>
                <PlusCircle size={13}/>Add
              </button>
            </div>

            {/* List */}
            {redirects.length===0 ? (
              <div style={{ padding:24, textAlign:"center", color:"var(--text-muted)", fontSize:13, border:"1px dashed var(--border)", borderRadius:10 }}>No redirects configured</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {redirects.map((r)=>(
                  <div key={r.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, background:"var(--bg-secondary)", border:"1px solid var(--border)", flexWrap:"wrap" }}>
                    <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:r.type==="301"?"rgba(34,197,94,0.1)":"rgba(245,158,11,0.1)", color:r.type==="301"?"#22c55e":"#f59e0b" }}>{r.type}</span>
                    <code style={{ fontSize:12, color:"var(--text-secondary)", flex:1 }}>{r.from}</code>
                    <span style={{ color:"var(--text-muted)" }}>→</span>
                    <code style={{ fontSize:12, color:"#60a5fa", flex:1 }}>{r.to}</code>
                    <button onClick={()=>{
                      navigator.clipboard.writeText(`${r.from} → ${r.to}`);
                      setCopiedId(r.id); setTimeout(()=>setCopiedId(""),1500);
                    }} style={{ background:"none", border:"none", cursor:"pointer", color:copiedId===r.id?"#22c55e":"var(--text-muted)", padding:4 }}>
                      <Copy size={13}/>
                    </button>
                    <button onClick={()=>setRedirects(rs=>rs.filter(x=>x.id!==r.id))} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", padding:4 }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          TAB: SITE SETTINGS
          ════════════════════════════════ */}
      {activeTab==="site" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Basic */}
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 16px", display:"flex", alignItems:"center", gap:8 }}><Globe size={14} color="#ea580c"/>Site Identity</h2>
            <div style={{ display:"grid", gap:14, gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))" }}>
              <Field label="Site Name" hint={`Preview: Page${site.title_separator}${site.site_name}`}>
                <input style={s.input} type="text" value={site.site_name} onChange={e=>updSite("site_name",e.target.value)} placeholder="Veliova"/>
              </Field>
              <div>
                <span style={s.label}>Title Separator</span>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {SEPARATORS.map(sep=>(
                    <button key={sep} onClick={()=>updSite("title_separator",sep)} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid", fontSize:13, fontFamily:"monospace", cursor:"pointer", background:site.title_separator===sep?"rgba(234,88,12,0.1)":"var(--bg-secondary)", borderColor:site.title_separator===sep?"#ea580c":"var(--border)", color:site.title_separator===sep?"#ea580c":"var(--text-secondary)" }}>
                      {sep}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Site URL">
                <input style={s.input} type="url" value={site.site_url} onChange={e=>updSite("site_url",e.target.value)} placeholder="https://veliova.com"/>
              </Field>
              <Field label="Twitter / X Handle">
                <input style={s.input} type="text" value={site.twitter_handle} onChange={e=>updSite("twitter_handle",e.target.value)} placeholder="@veliova"/>
              </Field>
              <div style={{ gridColumn:"1/-1" }}>
                <Field label="Default OG Image URL" hint="1200×630px — used when a page has no specific OG image">
                  <input style={s.input} type="url" value={site.default_og_image} onChange={e=>updSite("default_og_image",e.target.value)} placeholder="https://veliova.com/og-default.jpg"/>
                </Field>
              </div>
            </div>
          </div>

          {/* Organization */}
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 16px", display:"flex", alignItems:"center", gap:8 }}><BookOpen size={14} color="#ea580c"/>Organization Schema</h2>
            <div style={{ display:"grid", gap:14, gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))" }}>
              <Field label="Organization Name">
                <input style={s.input} type="text" value={site.organization_name} onChange={e=>updSite("organization_name",e.target.value)} placeholder="Veliova"/>
              </Field>
              <Field label="Organization Type">
                <select style={{ ...s.select, width:"100%" }} value={site.organization_type} onChange={e=>updSite("organization_type",e.target.value)}>
                  {["Organization","Corporation","LocalBusiness","OnlineStore","Store","Brand"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Logo URL">
                <input style={s.input} type="url" value={site.organization_logo} onChange={e=>updSite("organization_logo",e.target.value)} placeholder="https://veliova.com/logo.svg"/>
              </Field>
              <Field label="Organization URL">
                <input style={s.input} type="url" value={site.organization_url} onChange={e=>updSite("organization_url",e.target.value)} placeholder="https://veliova.com"/>
              </Field>
            </div>
          </div>

          {/* Local Business */}
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 4px", display:"flex", alignItems:"center", gap:8 }}><Map size={14} color="#ea580c"/>Local Business Schema <span style={{ fontSize:11, fontWeight:400, color:"var(--text-muted)", marginLeft:4 }}>(optional)</span></h2>
            <p style={{ fontSize:12, color:"var(--text-muted)", margin:"0 0 16px" }}>Fill this to enable LocalBusiness schema — shows your address, phone & hours in Google search.</p>
            <div style={{ display:"grid", gap:14, gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))" }}>
              <Field label="Business Name">
                <input style={s.input} type="text" value={site.local_business_name} onChange={e=>updSite("local_business_name",e.target.value)} placeholder="Veliova HQ"/>
              </Field>
              <Field label="Street Address">
                <input style={s.input} type="text" value={site.local_business_street} onChange={e=>updSite("local_business_street",e.target.value)} placeholder="123 Main St"/>
              </Field>
              <Field label="City">
                <input style={s.input} type="text" value={site.local_business_city} onChange={e=>updSite("local_business_city",e.target.value)} placeholder="New York"/>
              </Field>
              <Field label="State">
                <input style={s.input} type="text" value={site.local_business_state} onChange={e=>updSite("local_business_state",e.target.value)} placeholder="NY"/>
              </Field>
              <Field label="ZIP Code">
                <input style={s.input} type="text" value={site.local_business_zip} onChange={e=>updSite("local_business_zip",e.target.value)} placeholder="10001"/>
              </Field>
              <Field label="Country Code">
                <input style={s.input} type="text" value={site.local_business_country} onChange={e=>updSite("local_business_country",e.target.value)} placeholder="US"/>
              </Field>
              <Field label="Phone">
                <input style={s.input} type="text" value={site.local_business_phone} onChange={e=>updSite("local_business_phone",e.target.value)} placeholder="+1-555-000-0000"/>
              </Field>
              <Field label="Email">
                <input style={s.input} type="email" value={site.local_business_email} onChange={e=>updSite("local_business_email",e.target.value)} placeholder="hello@veliova.com"/>
              </Field>
              <Field label="Price Range">
                <input style={s.input} type="text" value={site.local_business_price_range} onChange={e=>updSite("local_business_price_range",e.target.value)} placeholder="$$ or $10–$50"/>
              </Field>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 16px", display:"flex", alignItems:"center", gap:8 }}><Hash size={14} color="#ea580c"/>Breadcrumb Navigation</h2>
            <div style={{ display:"grid", gap:14, gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))" }}>
              <div>
                <span style={s.label}>Enable Breadcrumbs</span>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"var(--text-secondary)" }}>
                  <input type="checkbox" checked={site.breadcrumbs_enabled} onChange={e=>updSite("breadcrumbs_enabled",e.target.checked)} style={{ accentColor:"#ea580c" }}/>
                  Show breadcrumbs on all pages
                </label>
              </div>
              <Field label="Breadcrumb Separator">
                <input style={s.input} type="text" value={site.breadcrumb_separator} onChange={e=>updSite("breadcrumb_separator",e.target.value)} placeholder=" > "/>
              </Field>
              <Field label="Home Label">
                <input style={s.input} type="text" value={site.breadcrumb_home_label} onChange={e=>updSite("breadcrumb_home_label",e.target.value)} placeholder="Home"/>
              </Field>
              <div>
                <span style={s.label}>Preview</span>
                <p style={{ fontSize:12, color:"#60a5fa", margin:0 }}>{site.breadcrumb_home_label}{site.breadcrumb_separator}Shop{site.breadcrumb_separator}Product Name</p>
              </div>
            </div>
          </div>

          {/* Webmaster */}
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 16px", display:"flex", alignItems:"center", gap:8 }}><Target size={14} color="#ea580c"/>Webmaster Verification</h2>
            <div style={{ display:"grid", gap:14, gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))" }}>
              <Field label="Google Search Console" hint="From Search Console → Settings → Ownership verification">
                <input style={s.input} type="text" value={site.google_verification} onChange={e=>updSite("google_verification",e.target.value)} placeholder="Paste content value from HTML tag"/>
              </Field>
              <Field label="Bing Webmaster Tools">
                <input style={s.input} type="text" value={site.bing_verification} onChange={e=>updSite("bing_verification",e.target.value)} placeholder="msvalidate.01=xxxxxxxx"/>
              </Field>
              <Field label="Pinterest Site Verification">
                <input style={s.input} type="text" value={site.pinterest_verification} onChange={e=>updSite("pinterest_verification",e.target.value)} placeholder="Paste meta content value"/>
              </Field>
              <Field label="Yandex Webmaster">
                <input style={s.input} type="text" value={site.yandex_verification} onChange={e=>updSite("yandex_verification",e.target.value)} placeholder="Paste verification code"/>
              </Field>
            </div>
          </div>

          {/* SEO Checklist */}
          <div style={{ ...s.card, padding:20 }}>
            <h2 style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}><ListChecks size={14} color="#ea580c"/>Site SEO Checklist</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:8 }}>
              {[
                { ok:!!site.site_name,               text:"Site name set" },
                { ok:!!site.site_url,                text:"Site URL configured" },
                { ok:!!site.default_og_image,        text:"Default OG image uploaded" },
                { ok:!!site.organization_logo,       text:"Organization logo set" },
                { ok:!!site.google_verification,     text:"Google Search Console connected" },
                { ok:!!site.bing_verification,       text:"Bing Webmaster verified" },
                { ok:!!site.twitter_handle,          text:"Twitter handle set" },
                { ok:!!site.pinterest_verification,  text:"Pinterest verified" },
                { ok:!!site.breadcrumbs_enabled,     text:"Breadcrumbs enabled" },
                { ok:!!site.local_business_name,     text:"LocalBusiness schema data filled" },
                { ok:pages.every(p=>!!p.focus_keyword), text:"Focus keywords set on all pages" },
                { ok:pages.every(p=>!!p.og_image),   text:"OG images set on all pages" },
              ].map(({ok,text})=>(
                <div key={text} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, background:ok?"rgba(34,197,94,0.05)":"rgba(239,68,68,0.04)", border:`1px solid ${ok?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.12)"}` }}>
                  {ok?<CheckCircle2 size={12} color="#22c55e"/>:<AlertCircle size={12} color="#ef4444"/>}
                  <span style={{ fontSize:12, color:ok?"var(--text-secondary)":"var(--text-primary)" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50, borderTop:"1px solid var(--border)", background:"var(--bg-primary)", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
        <p style={{ fontSize:11, color:"var(--text-muted)", margin:0 }}>All settings stored in Supabase. Connect to page metadata to apply live.</p>
        <button onClick={save} disabled={saving} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 20px", borderRadius:8, background:"#ea580c", color:"#fff", fontSize:13, fontWeight:600, border:"none", cursor:saving?"not-allowed":"pointer", opacity:saving?0.6:1 }}>
          {saving?<Loader2 size={13} style={{ animation:"spin 1s linear infinite" }}/>:<Save size={13}/>}
          {saving?"Saving…":"Save All Settings"}
        </button>
      </div>
    </div>
  );
}
