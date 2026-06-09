import { useState, useEffect, useCallback } from "react";

const SHIP_BG = "/ship-bg.jpg";
const FINNHUB_KEY = "d8jk4opr01qh6g3qs1mgd8jk4opr01qh6g3qs1n0";
const AV_KEY = "CL9GE1KDVYNDJEFG";
const CACHE_KEY = "northstar_demo_cache_v1";
const HISTORY_KEY = "northstar_demo_history_v1";
const FRIDAY_KEY = "northstar_demo_friday_v1";
const CACHE_HOURS_OPEN = 4;

const MUTUAL_FUNDS = new Set([
  "FXAIX","VTSAX","VBTIX","VTIAX","FPURX"
]);

const THEME = {
  navy: "#08122a", navyLight: "#0d1b2e", navyMid: "#112240",
  gold: "#d4b45a", goldDim: "rgba(212,180,90,0.6)",
  goldFaint: "rgba(212,180,90,0.12)", goldBorder: "rgba(212,180,90,0.22)",
  cream: "#e8dfc8", creamDim: "rgba(232,223,200,0.5)",
  creamFaint: "rgba(232,223,200,0.08)",
  green: "#5dca84", red: "#e2504a", cardBg: "rgba(8,18,42,0.82)",
};

const ACCOUNTS = [
  { id: "my_401k", label: "My 401(k)", owner: "Me", holdings: [
    { ticker: "VTI",   shares: 842.500 },
    { ticker: "VXUS",  shares: 312.750 },
    { ticker: "FXAIX", shares: 198.320 },
    { ticker: "QQQM",  shares: 145.000 },
  ]},
  { id: "my_roth", label: "My Roth IRA", owner: "Me", holdings: [
    { ticker: "VGT",  shares: 210.500 },
    { ticker: "SCHD", shares: 380.000 },
  ]},
  { id: "spouse_401k", label: "Spouse 401(k)", owner: "Spouse", holdings: [
    { ticker: "VTSAX", shares: 1240.880 },
    { ticker: "VBTIX", shares: 2100.000 },
    { ticker: "VTIAX", shares: 890.440  },
  ]},
  { id: "spouse_roth", label: "Spouse Roth IRA", owner: "Spouse", holdings: [
    { ticker: "VGT",  shares: 185.250 },
    { ticker: "FPURX", shares: 420.000 },
  ]},
  { id: "joint_brokerage", label: "Joint Brokerage", owner: "Joint", holdings: [
    { ticker: "AAPL", shares: 45.000  },
    { ticker: "MSFT", shares: 28.500  },
    { ticker: "IBIT", shares: 120.000 },
    { ticker: "SCHD", shares: 200.000 },
  ]},
];

const FUND_NAMES = {
  VTI:   "Vanguard Total Stock ETF",
  VXUS:  "Vanguard Total Intl ETF",
  FXAIX: "Fidelity 500 Index",
  QQQM:  "Invesco Nasdaq 100 ETF",
  VGT:   "Vanguard Info Tech ETF",
  SCHD:  "Schwab US Dividend ETF",
  VTSAX: "Vanguard Total Stock Adm",
  VBTIX: "Total Bond Mkt Index Inst",
  VTIAX: "Total Intl Stock Ix Admiral",
  FPURX: "Fidelity Puritan Fund",
  AAPL:  "Apple Inc",
  MSFT:  "Microsoft Corp",
  IBIT:  "iShares Bitcoin ETF",
};

function fmt(n) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", minimumFractionDigits:2, maximumFractionDigits:2 }).format(n);
}
function fmtShort(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1000000) return "$" + (n/1000000).toFixed(2) + "M";
  if (n >= 1000) return "$" + (n/1000).toFixed(1) + "K";
  return fmt(n);
}
function fmtPct(n) { return (n >= 0 ? "+" : "") + n.toFixed(2) + "%"; }

function isMarketOpen() {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const mins = et.getHours() * 60 + et.getMinutes();
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { prices, timestamp, marketWasClosed } = JSON.parse(raw);
    const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (!isMarketOpen() && marketWasClosed) return { prices, timestamp };
    if (ageHours < CACHE_HOURS_OPEN) return { prices, timestamp };
    return null;
  } catch { return null; }
}

function saveCache(prices) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ prices, timestamp: Date.now(), marketWasClosed: !isMarketOpen() }));
  } catch {}
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(entry) {
  try {
    const hist = loadHistory();
    const today = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    if (!hist.find(h => h.date === today)) {
      hist.push(entry);
      if (hist.length > 52) hist.shift();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    }
  } catch {}
}

function loadFridayData() {
  try { return JSON.parse(localStorage.getItem(FRIDAY_KEY) || "[]"); }
  catch { return []; }
}

function saveFridayClose(value) {
  try {
    const data = loadFridayData();
    const today = new Date();
    if (today.getDay() === 5) {
      const dateStr = today.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
      if (!data.find(d => d.date === dateStr)) {
        data.push({ date: dateStr, value });
        if (data.length > 12) data.shift();
        localStorage.setItem(FRIDAY_KEY, JSON.stringify(data));
      }
    }
  } catch {}
}

const StarIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M16 2L17.5 14L29 16L17.5 18L16 30L14.5 18L3 16L14.5 14Z" fill="#d4b45a" opacity="0.92"/>
    <path d="M16 8L16.8 15L24 16L16.8 17L16 24L15.2 17L8 16L15.2 15Z" fill="#fff8e7" opacity="0.5"/>
    <circle cx="16" cy="16" r="2.2" fill="#fffbe8"/>
  </svg>
);

function WeatherIcon({ pct }) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (pct <= -2) {
      const interval = setInterval(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
      }, 3000 + Math.random() * 2000);
      return () => clearInterval(interval);
    }
  }, [pct]);

  if (pct > 1) return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="12" fill="#ffd700" opacity="0.9"/>
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a} x1="24" y1="24" x2={24+18*Math.cos(a*Math.PI/180)} y2={24+18*Math.sin(a*Math.PI/180)} stroke="#ffd700" strokeWidth="2.5" strokeLinecap="round"/>
      ))}
    </svg>
  );
  if (pct > 0) return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="18" cy="22" r="8" fill="#ffd700" opacity="0.7"/>
      <ellipse cx="26" cy="26" rx="12" ry="8" fill="#aab8c2"/>
      <ellipse cx="20" cy="28" rx="8" ry="6" fill="#c8d6de"/>
    </svg>
  );
  if (pct > -2) return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <ellipse cx="24" cy="20" rx="14" ry="9" fill="#6e8a9a"/>
      <ellipse cx="18" cy="24" rx="9" ry="7" fill="#7a98a8"/>
      {[0,1,2].map(i => <line key={i} x1={16+i*6} y1="30" x2={14+i*6} y2="38" stroke="#4a90b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>)}
    </svg>
  );
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <ellipse cx="24" cy="16" rx="16" ry="10" fill="#3a4a5a"/>
      <ellipse cx="16" cy="20" rx="10" ry="8" fill="#2a3a4a"/>
      {[0,1,2,3].map(i => <line key={i} x1={12+i*7} y1="26" x2={10+i*7} y2="36" stroke="#4a90b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>)}
      <polygon points="26,22 22,30 25,30 21,38 29,28 25,28" fill={flash?"#fff176":"#d4b45a"} opacity={flash?1:0.85} style={{transition:"fill 0.05s"}}/>
    </svg>
  );
}

function WeatherMood({ pct }) {
  let label, sublabel, color;
  if (pct > 1) { label="Sailing Smoothly"; sublabel="Fair winds ahead"; color="#ffd700"; }
  else if (pct > 0) { label="Steady As She Goes"; sublabel="Light breeze today"; color=THEME.gold; }
  else if (pct > -2) { label="Navigating Rough Seas"; sublabel="Stay the course"; color="#4a90b8"; }
  else { label="Battening Down the Hatches"; sublabel="Ride out the storm"; color=THEME.red; }
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, background:THEME.cardBg, border:`0.5px solid ${THEME.goldBorder}`, borderRadius:10, padding:"0.75rem 1rem", marginBottom:"0.75rem" }}>
      <WeatherIcon pct={pct}/>
      <div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:15, color, fontWeight:500 }}>{label}</div>
        <div style={{ fontFamily:"Arial,sans-serif", fontSize:11, color:THEME.creamDim, marginTop:2 }}>{sublabel}</div>
      </div>
      <div style={{ marginLeft:"auto", textAlign:"right" }}>
        <div style={{ fontSize:13, fontWeight:500, color:pct>=0?THEME.green:THEME.red, fontFamily:"Arial,sans-serif" }}>{fmtPct(pct)} today</div>
        <div style={{ fontSize:10, color:THEME.creamDim, fontFamily:"Arial,sans-serif", marginTop:2 }}>
          {isMarketOpen() ? <span style={{color:THEME.green}}>● Markets Open</span> : <span style={{color:THEME.red}}>● Markets Closed</span>}
        </div>
      </div>
    </div>
  );
}

async function fetchFinnhub(ticker) {
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`);
  const data = await res.json();
  if (data && data.c && data.c > 0) return { price:data.c, change:data.d||0, changePct:data.dp||0 };
  return null;
}

async function fetchAlphaVantage(ticker) {
  const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`);
  const data = await res.json();
  const q = data["Global Quote"];
  if (q && q["05. price"]) {
    return { price:parseFloat(q["05. price"]), change:parseFloat(q["09. change"]||0), changePct:parseFloat((q["10. change percent"]||"0%").replace("%","")) };
  }
  return null;
}

function usePortfolioPrices(accounts) {
  const cached = loadCache();
  const [prices, setPrices] = useState(cached?.prices || {});
  const [loading, setLoading] = useState(!cached);
  const [lastUpdated, setLastUpdated] = useState(cached ? new Date(cached.timestamp) : null);
  const [fromCache, setFromCache] = useState(!!cached);
  const allTickers = [...new Set(accounts.flatMap(a => a.holdings.map(h => h.ticker)))];

  const fetchPrices = useCallback(async (force=false) => {
    if (!force) {
      const existing = loadCache();
      if (existing) { setPrices(existing.prices); setLastUpdated(new Date(existing.timestamp)); setFromCache(true); setLoading(false); return; }
    }
    setLoading(true); setFromCache(false);
    const results = {};
    const etfTickers = allTickers.filter(t => !MUTUAL_FUNDS.has(t));
    const mfTickers = allTickers.filter(t => MUTUAL_FUNDS.has(t));
    await Promise.all(etfTickers.map(async t => {
      try { const d = await fetchFinnhub(t); results[t] = d || {price:0,change:0,changePct:0}; }
      catch { results[t] = {price:0,change:0,changePct:0}; }
    }));
    setPrices({...results}); setLoading(false);
    for (const t of mfTickers) {
      try {
        const d = await fetchAlphaVantage(t);
        results[t] = d || {price:0,change:0,changePct:0};
        setPrices({...results});
        await new Promise(r => setTimeout(r, 13000));
      } catch { results[t] = {price:0,change:0,changePct:0}; }
    }
    saveCache(results); setLastUpdated(new Date());
  }, []);

  useEffect(() => { fetchPrices(false); }, []);
  return { prices, loading, lastUpdated, fromCache, refresh: () => fetchPrices(true) };
}

function accountValue(a, prices) { return a.holdings.reduce((s,h) => s+(prices[h.ticker]?.price||0)*h.shares, 0); }
function accountChange(a, prices) { return a.holdings.reduce((s,h) => s+(prices[h.ticker]?.change||0)*h.shares, 0); }
function ownerTotal(owner, accounts, prices) { return accounts.filter(a=>a.owner===owner).reduce((s,a)=>s+accountValue(a,prices),0); }
function ownerChange(owner, accounts, prices) { return accounts.filter(a=>a.owner===owner).reduce((s,a)=>s+accountChange(a,prices),0); }

function SummaryTile({ label, value, change, active, onClick }) {
  const pos = change >= 0;
  return (
    <div onClick={onClick} style={{ background:active?THEME.goldFaint:THEME.creamFaint, border:`${active?"1px":"0.5px"} solid ${active?THEME.gold:THEME.goldBorder}`, borderRadius:10, padding:"0.7rem 0.85rem", cursor:"pointer", transition:"all 0.2s" }}>
      <div style={{ fontSize:10, color:THEME.goldDim, letterSpacing:1, textTransform:"uppercase", fontFamily:"Arial,sans-serif", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:500, color:THEME.cream }}>{fmtShort(value)}</div>
      {change !== undefined && <div style={{ fontSize:10, color:pos?THEME.green:THEME.red, fontFamily:"Arial,sans-serif", marginTop:2 }}>{pos?"▲":"▼"} {fmt(Math.abs(change))}</div>}
    </div>
  );
}

function HoldingRow({ holding, prices }) {
  const p = prices[holding.ticker];
  const value = p ? p.price * holding.shares : null;
  const pos = p ? p.change >= 0 : true;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"56px 1fr 64px 80px", alignItems:"center", padding:"7px 14px", borderBottom:"0.5px solid rgba(212,180,90,0.07)", gap:4 }}>
      <div>
        <div style={{ fontSize:11, fontWeight:500, color:THEME.gold, fontFamily:"monospace" }}>{holding.ticker}</div>
        {p && p.price > 0 && <div style={{ fontSize:10, color:THEME.creamDim, fontFamily:"Arial,sans-serif" }}>${p.price.toFixed(2)}</div>}
      </div>
      <div style={{ fontSize:11, color:THEME.creamDim, fontFamily:"Arial,sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{FUND_NAMES[holding.ticker]||holding.ticker}</div>
      <div style={{ fontSize:11, color:THEME.creamDim, fontFamily:"Arial,sans-serif", textAlign:"right" }}>{holding.shares.toLocaleString(undefined,{maximumFractionDigits:3})}</div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:12, fontWeight:500, color:THEME.cream }}>{value&&value>0?fmt(value):"—"}</div>
        {p && p.price > 0 && <div style={{ fontSize:10, color:pos?THEME.green:THEME.red, fontFamily:"Arial,sans-serif" }}>{pos?"▲":"▼"} {Math.abs(p.changePct).toFixed(2)}%</div>}
      </div>
    </div>
  );
}

function AccountCard({ account, prices, expanded, onToggle }) {
  const value = accountValue(account, prices);
  const change = accountChange(account, prices);
  const pos = change >= 0;
  return (
    <div style={{ background:THEME.cardBg, border:`0.5px solid ${THEME.goldBorder}`, borderRadius:10, overflow:"hidden", marginBottom:8 }}>
      <div onClick={onToggle} style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }}>
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:THEME.gold }}>{account.label}</div>
          <div style={{ fontSize:10, color:THEME.creamDim, fontFamily:"Arial,sans-serif", marginTop:2 }}>{account.holdings.length} holding{account.holdings.length!==1?"s":""}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:14, fontWeight:500, color:THEME.cream }}>{value>0?fmt(value):"—"}</div>
            {value>0&&change!==0&&<div style={{ fontSize:10, color:pos?THEME.green:THEME.red, fontFamily:"Arial,sans-serif" }}>{pos?"▲":"▼"} {fmt(Math.abs(change))} today</div>}
          </div>
          <div style={{ color:THEME.goldDim, fontSize:14, transition:"transform 0.2s", transform:expanded?"rotate(180deg)":"rotate(0deg)" }}>▾</div>
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop:`0.5px solid ${THEME.goldBorder}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"56px 1fr 64px 80px", padding:"4px 14px", gap:4 }}>
            {["Ticker","Fund","Shares","Value"].map((h,i) => (
              <div key={h} style={{ fontSize:9, letterSpacing:1, textTransform:"uppercase", color:"rgba(232,223,200,0.3)", fontFamily:"Arial,sans-serif", textAlign:i>=2?"right":"left" }}>{h}</div>
            ))}
          </div>
          {account.holdings.map(h => <HoldingRow key={h.ticker+h.shares} holding={h} prices={prices}/>)}
        </div>
      )}
    </div>
  );
}

function CompassRose({ accounts, prices, owner }) {
  const filtered = owner === "All" ? accounts : accounts.filter(a => a.owner === owner);
  const allHoldings = [];
  filtered.forEach(a => a.holdings.forEach(h => {
    const ex = allHoldings.find(x => x.ticker === h.ticker);
    if (ex) ex.shares += h.shares;
    else allHoldings.push({...h});
  }));
  const holdingsWithValue = allHoldings.map(h => ({...h, value:(prices[h.ticker]?.price||0)*h.shares})).filter(h=>h.value>0);
  const total = holdingsWithValue.reduce((s,h)=>s+h.value,0);
  if (total === 0) return <div style={{color:THEME.creamDim,fontFamily:"Arial,sans-serif",fontSize:12,textAlign:"center",padding:"2rem"}}>Loading prices...</div>;
  const colors = ["#d4b45a","#5dca84","#4a90b8","#e2504a","#9b59b6","#e67e22","#1abc9c","#e91e63","#00bcd4","#8bc34a","#ff5722","#607d8b","#ffc107","#3f51b5","#009688"];
  let startAngle = -Math.PI/2;
  const cx=110, cy=110, r=85, inner=40;
  return (
    <div>
      <svg width="220" height="220" style={{display:"block",margin:"0 auto"}}>
        {holdingsWithValue.map((h,i) => {
          const pct = h.value/total;
          const angle = pct*2*Math.PI;
          const endAngle = startAngle+angle;
          const x1=cx+r*Math.cos(startAngle), y1=cy+r*Math.sin(startAngle);
          const x2=cx+r*Math.cos(endAngle), y2=cy+r*Math.sin(endAngle);
          const ix1=cx+inner*Math.cos(startAngle), iy1=cy+inner*Math.sin(startAngle);
          const ix2=cx+inner*Math.cos(endAngle), iy2=cy+inner*Math.sin(endAngle);
          const large = angle>Math.PI?1:0;
          const path=`M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}`;
          const mid=startAngle+angle/2;
          const lx=cx+(r+12)*Math.cos(mid), ly=cy+(r+12)*Math.sin(mid);
          startAngle=endAngle;
          return (
            <g key={h.ticker}>
              <path d={path} fill={colors[i%colors.length]} opacity="0.85" stroke={THEME.navyLight} strokeWidth="1"/>
              {pct>0.06&&<text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#fff" fontFamily="monospace" fontWeight="bold">{h.ticker}</text>}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={inner} fill={THEME.navyLight}/>
        <text x={cx} y={cy-8} textAnchor="middle" fontSize="10" fill={THEME.gold} fontFamily="Georgia,serif">Total</text>
        <text x={cx} y={cy+6} textAnchor="middle" fontSize="9" fill={THEME.cream} fontFamily="Arial,sans-serif">{fmtShort(total)}</text>
        {[0,90,180,270].map((deg,i) => {
          const dirs=["N","E","S","W"];
          const rad=(deg-90)*Math.PI/180;
          return <text key={deg} x={cx+(inner-12)*Math.cos(rad)} y={cy+(inner-12)*Math.sin(rad)} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={THEME.goldDim} fontFamily="Arial,sans-serif">{dirs[i]}</text>;
        })}
      </svg>
      <div style={{display:"flex",flexWrap:"wrap",gap:"6px 12px",marginTop:12,justifyContent:"center"}}>
        {holdingsWithValue.map((h,i) => (
          <div key={h.ticker} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:2,background:colors[i%colors.length]}}/>
            <span style={{fontSize:10,color:THEME.creamDim,fontFamily:"Arial,sans-serif"}}>{h.ticker} {((h.value/total)*100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RisingStars({ accounts, prices }) {
  const allTickers = [...new Set(accounts.flatMap(a => a.holdings.map(h => h.ticker)))];
  const ranked = allTickers
    .map(t => ({ ticker:t, name:FUND_NAMES[t]||t, changePct:prices[t]?.changePct||0 }))
    .filter(h => prices[h.ticker]?.price > 0)
    .sort((a,b) => b.changePct-a.changePct);
  const stars = ranked.slice(0,3);
  const rough = ranked.slice(-3).reverse();
  const FundRow = ({ fund, rank, isRising }) => (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"0.5px solid rgba(212,180,90,0.08)"}}>
      <div style={{width:24,height:24,borderRadius:"50%",background:isRising?"rgba(93,202,132,0.15)":"rgba(226,80,74,0.15)",border:`0.5px solid ${isRising?THEME.green:THEME.red}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:isRising?THEME.green:THEME.red,fontFamily:"Arial,sans-serif",fontWeight:500,flexShrink:0}}>{rank}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontWeight:500,color:THEME.gold,fontFamily:"monospace"}}>{fund.ticker}</div>
        <div style={{fontSize:10,color:THEME.creamDim,fontFamily:"Arial,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fund.name}</div>
      </div>
      <div style={{fontSize:13,fontWeight:500,color:isRising?THEME.green:THEME.red,fontFamily:"Arial,sans-serif"}}>{fmtPct(fund.changePct)}</div>
    </div>
  );
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div style={{background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,borderRadius:10,padding:"0.75rem"}}>
        <div style={{fontSize:11,color:THEME.green,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:8}}>⭐ Rising Stars</div>
        {stars.length>0?stars.map((f,i)=><FundRow key={f.ticker} fund={f} rank={i+1} isRising={true}/>):<div style={{fontSize:11,color:THEME.creamDim,fontFamily:"Arial,sans-serif"}}>Loading...</div>}
      </div>
      <div style={{background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,borderRadius:10,padding:"0.75rem"}}>
        <div style={{fontSize:11,color:THEME.red,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:8}}>🌊 Rough Seas</div>
        {rough.length>0?rough.map((f,i)=><FundRow key={f.ticker} fund={f} rank={i+1} isRising={false}/>):<div style={{fontSize:11,color:THEME.creamDim,fontFamily:"Arial,sans-serif"}}>Loading...</div>}
      </div>
    </div>
  );
}

function SideBySide({ accounts, prices }) {
  const allTickers = [...new Set(accounts.flatMap(a => a.holdings.map(h => h.ticker)))];
  const [tickerA, setTickerA] = useState(allTickers[0]);
  const [tickerB, setTickerB] = useState(allTickers[1]);
  const pA = prices[tickerA], pB = prices[tickerB];
  const selectStyle = {background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,color:THEME.gold,borderRadius:6,padding:"4px 8px",fontSize:12,fontFamily:"monospace",width:"100%",marginBottom:8};
  const StatRow = ({ label, valA, valB, higherIsBetter=true }) => {
    const aNum=parseFloat(valA), bNum=parseFloat(valB);
    const aWins=higherIsBetter?aNum>bNum:aNum<bNum;
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 80px 1fr",gap:4,padding:"5px 0",borderBottom:"0.5px solid rgba(212,180,90,0.07)",alignItems:"center"}}>
        <div style={{fontSize:12,color:aWins?THEME.green:THEME.cream,fontFamily:"Arial,sans-serif",textAlign:"right",fontWeight:aWins?500:400}}>{valA}</div>
        <div style={{fontSize:9,color:THEME.creamDim,fontFamily:"Arial,sans-serif",textAlign:"center",letterSpacing:0.5}}>{label}</div>
        <div style={{fontSize:12,color:!aWins?THEME.green:THEME.cream,fontFamily:"Arial,sans-serif",textAlign:"left",fontWeight:!aWins?500:400}}>{valB}</div>
      </div>
    );
  };
  return (
    <div style={{background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,borderRadius:10,padding:"0.75rem"}}>
      <div style={{fontSize:11,color:THEME.goldDim,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:10}}>Side by Side Comparison</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
        <select style={selectStyle} value={tickerA} onChange={e=>setTickerA(e.target.value)}>
          {allTickers.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select style={selectStyle} value={tickerB} onChange={e=>setTickerB(e.target.value)}>
          {allTickers.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 80px 1fr",gap:4,padding:"4px 0 8px",borderBottom:`0.5px solid ${THEME.goldBorder}`,marginBottom:4}}>
        <div style={{fontSize:12,color:THEME.gold,fontFamily:"monospace",textAlign:"right",fontWeight:500}}>{tickerA}</div>
        <div style={{fontSize:9,color:THEME.creamDim,fontFamily:"Arial,sans-serif",textAlign:"center"}}>vs</div>
        <div style={{fontSize:12,color:THEME.gold,fontFamily:"monospace",textAlign:"left",fontWeight:500}}>{tickerB}</div>
      </div>
      {pA&&pB?(
        <>
          <StatRow label="Price" valA={`$${pA.price.toFixed(2)}`} valB={`$${pB.price.toFixed(2)}`}/>
          <StatRow label="Day %" valA={fmtPct(pA.changePct)} valB={fmtPct(pB.changePct)}/>
          <StatRow label="Day $" valA={fmt(pA.change)} valB={fmt(pB.change)}/>
        </>
      ):<div style={{fontSize:11,color:THEME.creamDim,fontFamily:"Arial,sans-serif",textAlign:"center",padding:"1rem"}}>Loading prices...</div>}
    </div>
  );
}

function HistoryChart({ accounts, prices }) {
  const history = loadHistory();
  const totalValue = accounts.reduce((s,a)=>s+accountValue(a,prices),0);
  useEffect(() => { if (totalValue>0) saveHistory({date:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),value:totalValue}); }, [totalValue]);
  const fridayData = loadFridayData();
  if (history.length < 2) return (
    <div style={{background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,borderRadius:10,padding:"1.5rem",textAlign:"center"}}>
      <div style={{fontSize:13,color:THEME.gold,fontFamily:"Georgia,serif",marginBottom:8}}>Net Worth Over Time</div>
      <div style={{fontSize:11,color:THEME.creamDim,fontFamily:"Arial,sans-serif"}}>Your chart will build automatically over time. Check back tomorrow!</div>
      {totalValue>0&&<div style={{fontSize:20,color:THEME.gold,fontFamily:"Georgia,serif",marginTop:12}}>{fmt(totalValue)}</div>}
    </div>
  );
  const max=Math.max(...history.map(h=>h.value)), min=Math.min(...history.map(h=>h.value));
  const range=max-min||1;
  const w=280, h=120, pad=20;
  const points=history.map((e,i)=>{
    const x=pad+(i/(history.length-1))*(w-2*pad);
    const y=pad+(1-(e.value-min)/range)*(h-2*pad);
    return `${x},${y}`;
  }).join(" ");
  return (
    <div>
      <div style={{background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,borderRadius:10,padding:"0.75rem",marginBottom:10}}>
        <div style={{fontSize:11,color:THEME.goldDim,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:8}}>Net Worth Over Time</div>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`}>
          <polyline points={points} fill="none" stroke={THEME.gold} strokeWidth="2" strokeLinejoin="round"/>
          {history.map((e,i)=>{
            const x=pad+(i/(history.length-1))*(w-2*pad);
            const y=pad+(1-(e.value-min)/range)*(h-2*pad);
            return <circle key={i} cx={x} cy={y} r="3" fill={THEME.gold}/>;
          })}
          <text x={pad} y={h-4} fontSize="8" fill={THEME.creamDim} fontFamily="Arial,sans-serif">{history[0]?.date}</text>
          <text x={w-pad} y={h-4} fontSize="8" fill={THEME.creamDim} fontFamily="Arial,sans-serif" textAnchor="end">{history[history.length-1]?.date}</text>
          <text x={pad} y={pad-4} fontSize="8" fill={THEME.green} fontFamily="Arial,sans-serif">{fmtShort(max)}</text>
          <text x={pad} y={h-pad+12} fontSize="8" fill={THEME.red} fontFamily="Arial,sans-serif">{fmtShort(min)}</text>
        </svg>
      </div>
      {fridayData.length>0&&(
        <div style={{background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,borderRadius:10,padding:"0.75rem"}}>
          <div style={{fontSize:11,color:THEME.goldDim,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:8}}>📅 Friday Close History</div>
          {fridayData.slice().reverse().map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid rgba(212,180,90,0.07)"}}>
              <div style={{fontSize:11,color:THEME.creamDim,fontFamily:"Arial,sans-serif"}}>{d.date}</div>
              <div style={{fontSize:11,color:THEME.cream,fontFamily:"Arial,sans-serif",fontWeight:500}}>{fmt(d.value)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1=setTimeout(()=>setFade(true),2500);
    const t2=setTimeout(()=>onDone(),3200);
    return ()=>{clearTimeout(t1);clearTimeout(t2);};
  }, [onDone]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:100,backgroundImage:`url('${SHIP_BG}')`,backgroundSize:"cover",backgroundPosition:"center",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"opacity 0.7s ease",opacity:fade?0:1}}>
      <div style={{position:"absolute",inset:0,background:"rgba(6,14,32,0.35)"}}/>
      <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
        <StarIcon size={64}/>
        <div style={{fontFamily:"Georgia,serif",fontSize:48,color:"#d4b45a",marginTop:16,letterSpacing:1,textShadow:"0 2px 20px rgba(0,0,0,0.8)"}}>Northstar</div>
        <div style={{fontFamily:"Arial,sans-serif",fontSize:13,color:"rgba(212,180,90,0.7)",letterSpacing:4,textTransform:"uppercase",marginTop:8,textShadow:"0 2px 10px rgba(0,0,0,0.8)"}}>Family Wealth Dashboard</div>
        <div style={{fontFamily:"Arial,sans-serif",fontSize:11,color:"rgba(212,180,90,0.5)",marginTop:16}}>Demo Version</div>
      </div>
    </div>
  );
}

export default function NorthstarDemo() {
  const [screen, setScreen] = useState("splash");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [expandedOwner, setExpandedOwner] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [compassOwner, setCompassOwner] = useState("Me");
  const { prices, loading, lastUpdated, fromCache, refresh } = usePortfolioPrices(ACCOUNTS);
  const CORRECT_PIN = "000000";

  const totalValue = ACCOUNTS.reduce((s,a)=>s+accountValue(a,prices),0);
  const totalChange = ACCOUNTS.reduce((s,a)=>s+accountChange(a,prices),0);
  const totalPct = totalValue>0?(totalChange/(totalValue-totalChange))*100:0;
  const totalPos = totalChange >= 0;
  const owners = [{key:"Me",label:"My Total"},{key:"Spouse",label:"Spouse"},{key:"Joint",label:"Joint"}];
  const cacheAge = lastUpdated ? Math.floor((Date.now()-lastUpdated.getTime())/(1000*60)) : null;

  const [lightningBolts, setLightningBolts] = useState([]);
  useEffect(() => {
    if (totalPct <= -2) {
      const fire = () => {
        const x=10+Math.random()*80, id=Date.now();
        setLightningBolts(prev=>[...prev,{id,x}]);
        setTimeout(()=>setLightningBolts(prev=>prev.filter(b=>b.id!==id)),400);
      };
      const interval=setInterval(fire,2500+Math.random()*3000);
      return ()=>clearInterval(interval);
    } else { setLightningBolts([]); }
  }, [totalPct]);

  useEffect(() => { if (totalValue>0&&!loading) saveFridayClose(totalValue); }, [totalValue,loading]);

  function handlePin(digit) {
    if (pin.length < 6) {
      const next=pin+digit; setPin(next); setPinError(false);
      if (next.length===6) {
        setTimeout(()=>{
          if (next===CORRECT_PIN){setScreen("dashboard");setPin("");}
          else{setPinError(true);setTimeout(()=>setPin(""),600);}
        },200);
      }
    }
  }
  function handleDelete() { setPin(p=>p.slice(0,-1)); setPinError(false); }
  function toggleOwner(owner) { setExpandedOwner(prev=>prev===owner?null:owner); }
  function toggleAccount(id) { setExpandedAccounts(prev=>({...prev,[id]:!prev[id]})); }

  if (screen==="splash") return <SplashScreen onDone={()=>setScreen("login")}/>;

  if (screen==="login") return (
    <div style={{background:THEME.navy,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`url('${SHIP_BG}')`,backgroundSize:"cover",backgroundPosition:"center",opacity:0.55}}/>
      <div style={{position:"absolute",inset:0,background:"rgba(6,14,32,0.55)"}}/>
      <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center"}}>
        <StarIcon size={52}/>
        <div style={{fontFamily:"Georgia,serif",fontSize:28,color:THEME.gold,marginTop:12,letterSpacing:0.5}}>Northstar</div>
        <div style={{fontFamily:"Arial,sans-serif",fontSize:11,color:THEME.goldDim,letterSpacing:2.5,textTransform:"uppercase",marginBottom:8}}>Family Wealth Dashboard</div>
        <div style={{fontFamily:"Arial,sans-serif",fontSize:11,color:"rgba(212,180,90,0.45)",marginBottom:24}}>Demo Version · PIN: 000000</div>
        <div style={{fontSize:13,color:THEME.creamDim,fontFamily:"Arial,sans-serif",marginBottom:20}}>Enter PIN to continue</div>
        <div style={{display:"flex",gap:12,marginBottom:32}}>
          {[0,1,2,3,4,5].map(i=>(
            <div key={i} style={{width:14,height:14,borderRadius:"50%",background:i<pin.length?THEME.gold:"transparent",border:`1.5px solid ${pinError?THEME.red:THEME.goldBorder}`,transition:"all 0.15s"}}/>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3, 64px)",gap:10}}>
          {[1,2,3,4,5,6,7,8,9].map(d=>(
            <button key={d} onClick={()=>handlePin(String(d))} style={{width:64,height:64,borderRadius:"50%",background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,color:THEME.cream,fontSize:20,fontFamily:"Georgia,serif",cursor:"pointer"}}>{d}</button>
          ))}
          <div/>
          <button onClick={()=>handlePin("0")} style={{width:64,height:64,borderRadius:"50%",background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,color:THEME.cream,fontSize:20,fontFamily:"Georgia,serif",cursor:"pointer"}}>0</button>
          <button onClick={handleDelete} style={{width:64,height:64,borderRadius:"50%",background:"transparent",border:"none",color:THEME.goldDim,fontSize:18,cursor:"pointer"}}>⌫</button>
        </div>
        {pinError&&<div style={{marginTop:16,fontSize:12,color:THEME.red,fontFamily:"Arial,sans-serif"}}>Incorrect PIN. Try again.</div>}
      </div>
    </div>
  );

  const tabBg={background:"rgba(8,18,40,0.92)",borderTop:`0.5px solid ${THEME.goldBorder}`,display:"flex",position:"fixed",bottom:0,left:0,right:0,zIndex:10};
  const tabBtn=(id,icon,label)=>(
    <button key={id} onClick={()=>setActiveTab(id)} style={{flex:1,background:"transparent",border:"none",padding:"8px 0 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <span style={{fontSize:18}}>{icon}</span>
      <span style={{fontSize:9,fontFamily:"Arial,sans-serif",letterSpacing:0.5,textTransform:"uppercase",color:activeTab===id?THEME.gold:THEME.creamDim}}>{label}</span>
      {activeTab===id&&<div style={{width:20,height:2,background:THEME.gold,borderRadius:1}}/>}
    </button>
  );

  return (
    <div style={{background:THEME.navyLight,minHeight:"100vh",position:"relative",paddingBottom:70}}>
      <div style={{position:"fixed",inset:0,backgroundImage:`url('${SHIP_BG}')`,backgroundSize:"cover",backgroundPosition:"center bottom",opacity:0.30,zIndex:0}}/>
      <div style={{position:"fixed",inset:0,background:"rgba(6,14,32,0.45)",zIndex:1}}/>
      {lightningBolts.map(bolt=>(
        <div key={bolt.id} style={{position:"fixed",top:0,left:`${bolt.x}%`,width:2,height:"35vh",zIndex:3,pointerEvents:"none",background:"linear-gradient(to bottom, rgba(255,255,220,0.0) 0%, rgba(255,255,180,0.7) 30%, rgba(255,255,220,0.9) 50%, rgba(200,220,255,0.6) 70%, rgba(255,255,255,0) 100%)",filter:"blur(1.5px)",transform:`skewX(${-15+Math.random()*30}deg)`,opacity:0.7}}/>
      ))}
      <div style={{position:"relative",zIndex:2}}>
        <div style={{background:"rgba(8,18,40,0.92)",padding:"0.75rem 1.25rem 0.5rem",borderBottom:`0.5px solid ${THEME.goldBorder}`,display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:10}}>
          <StarIcon size={24}/>
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:16,color:THEME.gold}}>{getGreeting()} — Demo</div>
            <div style={{fontFamily:"Arial,sans-serif",fontSize:9,color:THEME.goldDim,letterSpacing:1.5,textTransform:"uppercase"}}>Family Wealth Dashboard</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            {loading&&<div style={{fontSize:10,color:THEME.goldDim,fontFamily:"Arial,sans-serif"}}>Updating...</div>}
            {!loading&&lastUpdated&&<div style={{fontSize:10,color:"rgba(232,223,200,0.3)",fontFamily:"Arial,sans-serif"}}>{fromCache?`${cacheAge}m ago`:lastUpdated.toLocaleTimeString()}</div>}
            <button onClick={refresh} style={{background:"transparent",border:`0.5px solid ${THEME.goldBorder}`,color:THEME.goldDim,borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>↻</button>
            <button onClick={()=>setScreen("login")} style={{background:"transparent",border:"none",color:"rgba(232,223,200,0.3)",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Lock</button>
          </div>
        </div>

        {activeTab==="dashboard"&&(
          <div style={{padding:"0.75rem 1rem 0"}}>
            <div style={{background:"rgba(6,14,32,0.78)",border:`0.5px solid ${THEME.goldBorder}`,borderRadius:10,padding:"0.9rem 1.1rem",marginBottom:"0.75rem"}}>
              <div style={{fontFamily:"Arial,sans-serif",fontSize:10,color:THEME.goldDim,letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Total Family Portfolio</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:30,fontWeight:500,color:THEME.gold}}>{loading?"Loading...":totalValue>0?fmt(totalValue):"Markets closed"}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
                {!loading&&totalChange!==0&&<div style={{fontSize:12,color:totalPos?THEME.green:THEME.red,fontFamily:"Arial,sans-serif"}}>{totalPos?"▲":"▼"} {fmt(Math.abs(totalChange))} today</div>}
                <div style={{fontSize:11,color:"rgba(232,223,200,0.35)",fontFamily:"Arial,sans-serif"}}>· 5 accounts · 13 holdings · Demo</div>
              </div>
            </div>
            {totalValue>0&&<WeatherMood pct={totalPct}/>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"0.75rem"}}>
              {owners.map(({key,label})=>(
                <SummaryTile key={key} label={label} value={ownerTotal(key,ACCOUNTS,prices)} change={ownerChange(key,ACCOUNTS,prices)} active={expandedOwner===key} onClick={()=>toggleOwner(key)}/>
              ))}
            </div>
            <div style={{padding:"0 0 1rem"}}>
              {expandedOwner?(
                <>
                  <div style={{fontSize:11,color:THEME.goldDim,fontFamily:"Arial,sans-serif",letterSpacing:1,textTransform:"uppercase",marginBottom:8,paddingLeft:2}}>
                    {expandedOwner==="Joint"?"Joint Accounts":`${expandedOwner}'s Accounts`}
                  </div>
                  {ACCOUNTS.filter(a=>a.owner===expandedOwner).map(account=>(
                    <AccountCard key={account.id} account={account} prices={prices} expanded={!!expandedAccounts[account.id]} onToggle={()=>toggleAccount(account.id)}/>
                  ))}
                  <button onClick={()=>setExpandedOwner(null)} style={{width:"100%",background:"transparent",border:`0.5px solid ${THEME.goldBorder}`,color:THEME.goldDim,borderRadius:8,padding:"7px",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif",marginTop:4}}>↑ Back to summary</button>
                </>
              ):(
                <>
                  <div style={{fontSize:11,color:THEME.goldDim,fontFamily:"Arial,sans-serif",letterSpacing:1,textTransform:"uppercase",marginBottom:8,paddingLeft:2}}>All Accounts</div>
                  {ACCOUNTS.map(account=>(
                    <AccountCard key={account.id} account={account} prices={prices} expanded={!!expandedAccounts[account.id]} onToggle={()=>toggleAccount(account.id)}/>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab==="insights"&&(
          <div style={{padding:"0.75rem 1rem"}}>
            <div style={{fontSize:11,color:THEME.goldDim,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:10}}>Rising Stars & Rough Seas</div>
            <RisingStars accounts={ACCOUNTS} prices={prices}/>
            <div style={{fontSize:11,color:THEME.goldDim,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",margin:"16px 0 10px"}}>Compass Rose — Portfolio Allocation</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {["Me","Spouse","Joint","All"].map(o=>(
                <button key={o} onClick={()=>setCompassOwner(o)} style={{flex:1,background:compassOwner===o?THEME.goldFaint:"transparent",border:`0.5px solid ${compassOwner===o?THEME.gold:THEME.goldBorder}`,color:compassOwner===o?THEME.gold:THEME.creamDim,borderRadius:6,padding:"4px 0",fontSize:11,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>{o}</button>
              ))}
            </div>
            <div style={{background:THEME.cardBg,border:`0.5px solid ${THEME.goldBorder}`,borderRadius:10,padding:"1rem",marginBottom:12}}>
              <CompassRose accounts={ACCOUNTS} prices={prices} owner={compassOwner}/>
            </div>
            <div style={{fontSize:11,color:THEME.goldDim,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:10}}>Side by Side Comparison</div>
            <SideBySide accounts={ACCOUNTS} prices={prices}/>
          </div>
        )}

        {activeTab==="history"&&(
          <div style={{padding:"0.75rem 1rem"}}>
            <div style={{fontSize:11,color:THEME.goldDim,letterSpacing:1,textTransform:"uppercase",fontFamily:"Arial,sans-serif",marginBottom:10}}>Portfolio History</div>
            <HistoryChart accounts={ACCOUNTS} prices={prices}/>
          </div>
        )}
      </div>
      <div style={tabBg}>
        {tabBtn("dashboard","⭐","Dashboard")}
        {tabBtn("insights","🧭","Insights")}
        {tabBtn("history","📈","History")}
      </div>
    </div>
  );
}
