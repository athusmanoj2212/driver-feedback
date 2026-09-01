import React, { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  NavLink,
  useNavigate,
  useParams,
  Outlet,
} from "react-router-dom";
import {
  CarFront, LayoutDashboard, Plus, MessageSquare, LogOut, UserRound,
  Star, CheckCircle2, AlertTriangle, Copy, ExternalLink, Menu, X,
  Loader2, ShieldCheck
} from "lucide-react";
import { supabase } from "./supabase";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (loading) return <FullScreenLoader />;

  return (
    <Routes>
      <Route path="/feedback/:token" element={<PublicFeedback />} />
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Auth mode="login" />} />
      <Route path="/signup" element={session ? <Navigate to="/dashboard" replace /> : <Auth mode="signup" />} />
      <Route element={<ProtectedLayout session={session} />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trips/new" element={<NewTrip />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function FullScreenLoader() {
  return <div className="screen-center"><Loader2 className="spin" size={28} /></div>;
}

function ProtectedLayout({ session }) {
  if (!session) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="page"><OutletFix /></div>
      </main>
    </div>
  );
}

function OutletFix() {
  return <Outlet />;
}

function Sidebar() {
  const [open, setOpen] = useState(false);
  const items = [
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/trips/new", "New trip", Plus],
    ["/feedback", "Feedback", MessageSquare],
    ["/profile", "Profile", UserRound],
  ];
  return (
    <>
      <button className="mobile-menu" onClick={() => setOpen(true)}><Menu /></button>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><CarFront size={22}/></div>
          <div><strong>Trip Feedback</strong><span>FOR FREELANCE DRIVERS</span></div>
        </div>
        <nav>
          {items.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <Icon size={18}/>{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-note"><ShieldCheck size={17}/><span>Private driver data</span></div>
          <button className="nav-link logout" onClick={async () => { await supabase.auth.signOut(); }}>
            <LogOut size={18}/>Log out
          </button>
        </div>
        {open && <button className="drawer-close" onClick={() => setOpen(false)}><X /></button>}
      </aside>
    </>
  );
}

function Topbar() {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    });
  }, []);
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">DRIVER PORTAL</p>
        <h1>Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
      </div>
      <div className="top-user">
        <div className="avatar">{(profile?.full_name || "D").slice(0,1).toUpperCase()}</div>
        <span>{profile?.full_name || "Driver"}</span>
      </div>
    </header>
  );
}

function Auth({ mode }) {
  const signup = mode === "signup";
  const navigate = useNavigate();
  const [form, setForm] = useState({name:"", email:"", password:"", confirm:""});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (signup) {
        if (form.password !== form.confirm) throw new Error("Passwords do not match.");
        if (form.password.length < 6) throw new Error("Password must be at least 6 characters.");
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { data: { full_name: form.name.trim() } }
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id, full_name: form.name.trim(), email: form.email.trim()
          });
        }
        setMessage(data.session ? "Account created." : "Account created. Check your email to confirm your account.");
        if (data.session) navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(), password: form.password
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err) { setError(err.message || "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (!form.email) return setError("Enter your email first.");
    setError(""); setMessage(""); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
      redirectTo: window.location.origin + "/profile"
    });
    setBusy(false);
    if (error) setError(error.message); else setMessage("Password reset email sent.");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-icon"><CarFront size={22}/></div>
          <div><strong>Trip Feedback</strong><span>FOR FREELANCE DRIVERS</span></div>
        </div>
        <h2>{signup ? "Create your driver account" : "Welcome back"}</h2>
        <p className="muted">{signup ? "Start managing real trips and passenger feedback." : "Sign in to your private driver dashboard."}</p>
        <form onSubmit={submit}>
          {signup && <Field label="Full name" value={form.name} onChange={v=>setForm({...form,name:v})} required />}
          <Field label="Email" type="email" value={form.email} onChange={v=>setForm({...form,email:v})} required />
          <Field label="Password" type="password" value={form.password} onChange={v=>setForm({...form,password:v})} required />
          {signup && <Field label="Confirm password" type="password" value={form.confirm} onChange={v=>setForm({...form,confirm:v})} required />}
          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}
          <button className="primary full" disabled={busy}>{busy ? <Loader2 className="spin"/> : null}{signup ? "Create account" : "Sign in"}</button>
        </form>
        {!signup && <button className="text-button" onClick={reset} disabled={busy}>Forgot password?</button>}
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New driver?"}{" "}
          <Link to={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create account"}</Link>
        </p>
      </div>
    </div>
  );
}

function Field({label, value, onChange, type="text", required=false}) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} required={required}/></label>
}

function Dashboard() {
  const [data, setData] = useState({ trips: [], feedback: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: trips }, { data: feedback }] = await Promise.all([
      supabase.from("trips").select("*").eq("driver_id", user.id).order("trip_date", {ascending:false}),
      supabase.from("feedback").select("*").eq("driver_id", user.id).order("created_at", {ascending:false})
    ]);
    setData({trips: trips || [], feedback: feedback || []});
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const avg = data.feedback.length ? (data.feedback.reduce((s,f)=>s+f.rating,0)/data.feedback.length).toFixed(1) : "—";
  const excellent = data.feedback.filter(f=>f.rating===5).length;
  const poor = data.feedback.filter(f=>f.rating<=2).length;

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">OVERVIEW</p><h2>Your trips & feedback</h2></div>
        <Link className="primary" to="/trips/new"><Plus size={18}/> New Trip</Link>
      </div>

      <div className="stats-grid">
        <Stat label="TOTAL TRIPS" value={loading ? "…" : data.trips.length} sub={data.trips.length ? "Real trips recorded" : "No trips yet"} />
        <Stat label="AVG RATING" value={loading ? "…" : avg} sub={data.feedback.length ? "From passenger feedback" : "No feedback yet"} stars={data.feedback.length > 0}/>
        <Stat label="EXCELLENT" value={loading ? "…" : excellent} sub={`of ${data.feedback.length} feedback`} />
        <Stat label="POOR" value={loading ? "…" : poor} sub={poor ? "needs follow-up" : "No poor ratings"} />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-head"><h3>Recent trips</h3><Link to="/trips/new" className="small-action"><Plus size={16}/> New</Link></div>
          {data.trips.length === 0 ? <Empty title="No trips yet" text="Create your first trip to start building your feedback history." /> :
            <div className="list">{data.trips.slice(0,6).map(t=><TripRow key={t.id} trip={t}/>)}</div>}
        </section>
        <section className="panel">
          <div className="panel-head"><h3>Latest passenger feedback</h3><MessageSquare size={18}/></div>
          {data.feedback.length === 0 ? <Empty title="No feedback yet" text="Passenger feedback will appear here after a trip is reviewed."/> :
            <div className="feedback-list">{data.feedback.slice(0,3).map(f=><FeedbackCard key={f.id} feedback={f}/>)}</div>}
        </section>
      </div>
    </>
  );
}

function Stat({label,value,sub,stars}) {
  return <div className="stat-card"><span className="stat-label">{label}</span><strong>{value}</strong>{stars ? <div className="stars">★★★★★</div> : <span className="stat-sub">{sub}</span>}</div>
}
function TripRow({trip}) {
  return <div className="trip-row">
    <div className="trip-icon"><CarFront size={19}/></div>
    <div className="trip-main"><strong>{trip.passenger_name}</strong><span>{new Date(trip.trip_date).toLocaleString()} · {trip.vehicle_number || "Vehicle not set"} · {trip.trip_type || "Standard"}</span></div>
    <span className={`status ${trip.status || "completed"}`}>{trip.status || "completed"}</span>
  </div>
}
function FeedbackCard({feedback}) {
  return <div className="feedback-card"><div className="feedback-top"><strong>{feedback.passenger_name || "Passenger"}</strong><span className="stars">{ "★".repeat(feedback.rating) }<span className="stars-dim">{"★".repeat(5-feedback.rating)}</span></span></div><p>“{feedback.comment || "No comment provided."}”</p><span className="feedback-date">{new Date(feedback.created_at).toLocaleString()}</span></div>
}
function Empty({title,text}) { return <div className="empty"><div className="empty-icon"><MessageSquare size={20}/></div><strong>{title}</strong><p>{text}</p></div> }

function NewTrip() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({passenger_name:"",trip_date:new Date().toISOString().slice(0,16),vehicle_number:"",trip_type:"Economy",status:"completed"});
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [created,setCreated]=useState(null);

  useEffect(()=>{ supabase.auth.getUser().then(async ({data:{user}})=>{ if(user){ const {data}=await supabase.from("profiles").select("*").eq("id",user.id).single(); setProfile(data); if(data?.vehicle_number) setForm(f=>({...f,vehicle_number:data.vehicle_number})); }});},[]);

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const {data:{user}}=await supabase.auth.getUser();
      if(!user) throw new Error("You are not signed in.");
      const token = crypto.randomUUID().replaceAll("-","");
      const {data,error}=await supabase.from("trips").insert({
        driver_id:user.id, passenger_name:form.passenger_name.trim(), trip_date:new Date(form.trip_date).toISOString(),
        vehicle_number:form.vehicle_number.trim(), trip_type:form.trip_type, status:form.status, feedback_token:token
      }).select().single();
      if(error) throw error;
      setCreated(data);
    } catch(err){setError(err.message || "Could not create trip.");} finally{setBusy(false);}
  }

  if(created) return <div className="success-page"><CheckCircle2 size={52}/><h2>Trip created</h2><p>Your trip is saved. Share the feedback link with the passenger after the trip.</p><div className="share-box"><input readOnly value={`${window.location.origin}/feedback/${created.feedback_token}`}/><button className="icon-button" onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/feedback/${created.feedback_token}`)}><Copy/></button><a className="icon-button" target="_blank" rel="noreferrer" href={`/feedback/${created.feedback_token}`}><ExternalLink/></a></div><div className="button-row"><button className="secondary" onClick={()=>setCreated(null)}>Create another</button><button className="primary" onClick={()=>navigate("/dashboard")}>Back to dashboard</button></div></div>;

  return <div className="form-page"><div className="page-heading"><div><p className="eyebrow">TRIPS</p><h2>Create a new trip</h2><p className="muted">Record the trip and generate a private feedback link for the passenger.</p></div></div>
    <form className="panel form-panel" onSubmit={submit}>
      <Field label="Passenger name" value={form.passenger_name} onChange={v=>setForm({...form,passenger_name:v})} required/>
      <div className="two-col"><Field label="Trip date & time" type="datetime-local" value={form.trip_date} onChange={v=>setForm({...form,trip_date:v})} required/><Field label="Vehicle number" value={form.vehicle_number} onChange={v=>setForm({...form,vehicle_number:v})}/></div>
      <div className="two-col">
        <label className="field"><span>Trip type</span><select value={form.trip_type} onChange={e=>setForm({...form,trip_type:e.target.value})}><option>Economy</option><option>Premium</option><option>Airport</option><option>Outstation</option></select></label>
        <label className="field"><span>Status</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="completed">Completed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="form-actions"><Link className="secondary" to="/dashboard">Cancel</Link><button className="primary" disabled={busy}>{busy && <Loader2 className="spin"/>} Create trip</button></div>
    </form>
  </div>
}

function Feedback() {
  const [items,setItems]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{supabase.auth.getUser().then(async({data:{user}})=>{if(user){const {data}=await supabase.from("feedback").select("*").eq("driver_id",user.id).order("created_at",{ascending:false});setItems(data||[]);}setLoading(false);});},[]);
  return <div><div className="page-heading"><div><p className="eyebrow">FEEDBACK</p><h2>Passenger feedback</h2></div></div>
    <section className="panel">{loading?<FullScreenLoader/>:items.length===0?<Empty title="No feedback yet" text="Feedback submitted through your trip links will appear here."/>:<div className="feedback-list">{items.map(f=><FeedbackCard key={f.id} feedback={f}/>)}</div>}</section>
  </div>
}

function Profile() {
  const [form,setForm]=useState({full_name:"",email:"",phone:"",vehicle_number:"",vehicle_model:""}); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{supabase.auth.getUser().then(async({data:{user}})=>{if(user){const {data}=await supabase.from("profiles").select("*").eq("id",user.id).single();setForm({full_name:data?.full_name||"",email:user.email||"",phone:data?.phone||"",vehicle_number:data?.vehicle_number||"",vehicle_model:data?.vehicle_model||""});}})},[]);
  async function save(e){e.preventDefault();setBusy(true);setError("");setMessage("");const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("profiles").update({full_name:form.full_name,phone:form.phone,vehicle_number:form.vehicle_number,vehicle_model:form.vehicle_model,updated_at:new Date().toISOString()}).eq("id",user.id);if(error)setError(error.message);else setMessage("Profile updated.");setBusy(false);}
  return <div className="form-page"><div className="page-heading"><div><p className="eyebrow">ACCOUNT</p><h2>Driver profile</h2></div></div><form className="panel form-panel" onSubmit={save}><div className="two-col"><Field label="Full name" value={form.full_name} onChange={v=>setForm({...form,full_name:v})} required/><Field label="Email" value={form.email} onChange={()=>{}}/></div><div className="two-col"><Field label="Phone" value={form.phone} onChange={v=>setForm({...form,phone:v})}/><Field label="Vehicle number" value={form.vehicle_number} onChange={v=>setForm({...form,vehicle_number:v})}/></div><Field label="Vehicle model" value={form.vehicle_model} onChange={v=>setForm({...form,vehicle_model:v})}/>{error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}<div className="form-actions"><button className="primary" disabled={busy}>{busy?<Loader2 className="spin"/>:null} Save changes</button></div></form></div>
}

function PublicFeedback() {
  const {token}=useParams(); const [trip,setTrip]=useState(null); const [form,setForm]=useState({passenger_name:"",rating:5,comment:""}); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [done,setDone]=useState(false);
    useEffect(()=>{supabase.from("trips").select("id,passenger_name,trip_type,vehicle_number,trip_date,driver_id").eq("feedback_token",token).single().then(({data,error})=>{setTrip(data);if(error)setError("This feedback link is invalid or has expired.");setLoading(false);});},[token]);
      async function submit(e){e.preventDefault();setBusy(true);setError("");const {error}=await supabase.from("feedback").insert({trip_id:trip.id,driver_id:trip.driver_id,passenger_name:form.passenger_name.trim()||trip.passenger_name,rating:Number(form.rating),comment:form.comment.trim()||null,submission_token:token});if(error)setError(error.message);else setDone(true);setBusy(false);}
        if(loading)return <FullScreenLoader/>; if(done)return <div className="auth-page"><div className="auth-card centered"><CheckCircle2 size={52}/><h2>Thank you!</h2><p className="muted">Your feedback has been submitted successfully.</p></div></div>;
          if(!trip)return <div className="auth-page"><div className="auth-card centered"><AlertTriangle size={42}/><h2>Link unavailable</h2><p className="muted">{error}</p></div></div>;
            return <div className="auth-page"><div className="auth-card feedback-public"><div className="brand auth-brand"><div className="brand-icon"><CarFront size={22}/></div><div><strong>Trip Feedback</strong><span>PASSENGER FEEDBACK</span></div></div><h2>How was your trip?</h2><p className="muted">Your feedback helps the driver improve their service.</p><div className="trip-summary"><strong>{trip.passenger_name}</strong><span>{trip.trip_type || "Trip"} · {trip.vehicle_number || "Vehicle"}</span></div><form onSubmit={submit}><label className="field"><span>Your name</span><input value={form.passenger_name} onChange={e=>setForm({...form,passenger_name:e.target.value})}/></label><div className="rating-picker"><span>Rating</span><div>{[1,2,3,4,5].map(n=><button type="button" key={n} className={n<=form.rating?"star-btn selected":"star-btn"} onClick={()=>setForm({...form,rating:n})}><Star fill="currentColor"/></button>)}</div></div><label className="field"><span>Comment</span><textarea rows="4" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} placeholder="Tell us about your experience..."/></label>{error&&<div className="alert error">{error}</div>}<button className="primary full" disabled={busy}>{busy?<Loader2 className="spin"/>:null} Submit feedback</button></form></div></div>
            }

export default App;
