import { useState, useEffect, useCallback } from "react";

const WEBHOOK_BASE = window.location.origin;
const WEBHOOK_PATH = "/webhook";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id: number;
  psid: string;
  name: string | null;
  mobile: string | null;
  status: string;
  last_message: string | null;
  service: string | null;
  booking_date: string | null;
  booking_time: string | null;
  reference_no: string | null;
  channel: "messenger" | "instagram" | null;
  concern: string | null;
  recommended_service: string | null;
  safety_flags: string | null;
  intent: string | null;
  lead_status: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: number;
  psid: string;
  direction: "inbound" | "outbound";
  content: string;
  created_at: string;
}

interface Stats {
  total: string;
  inquiries: string;
  confirmed: string;
  needs_followup: string;
  bookings: string;
  escalated: string;
  safety_flagged: string;
  skin_concerns: string;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const r = await fetch(`/api/admin${path}`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<T>;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    inquiry:           { label: "Inquiry",          cls: "bg-blue-100 text-blue-700" },
    confirmed:         { label: "Confirmed ✓",      cls: "bg-emerald-100 text-emerald-700" },
    needs_followup:    { label: "Follow-up",         cls: "bg-amber-100 text-amber-700" },
    cancelled:         { label: "Cancelled",         cls: "bg-red-100 text-red-600" },
    booking_requested: { label: "Booking 📅",        cls: "bg-purple-100 text-purple-700" },
    escalated:         { label: "Escalated 🔔",      cls: "bg-orange-100 text-orange-700" },
  };
  const { label, cls } = map[status] ?? map.inquiry;
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

function LeadBadge({ leadStatus }: { leadStatus: string | null }) {
  if (!leadStatus) return null;
  const map: Record<string, { label: string; cls: string }> = {
    new_lead:              { label: "New",             cls: "bg-sky-100 text-sky-700" },
    browsing:              { label: "Browsing",        cls: "bg-gray-100 text-gray-600" },
    skin_concern_inquiry:  { label: "Skin Concern",    cls: "bg-pink-100 text-pink-700" },
    booking_requested:     { label: "Booking Req.",    cls: "bg-purple-100 text-purple-700" },
    booking_confirmed:     { label: "Booked ✓",        cls: "bg-emerald-100 text-emerald-700" },
    escalated:             { label: "Escalated 🔔",    cls: "bg-orange-100 text-orange-700" },
    safety_flagged:        { label: "Safety Flag ⚠️",  cls: "bg-red-100 text-red-700" },
    injectable_cleared:    { label: "Cleared 💉",      cls: "bg-teal-100 text-teal-700" },
  };
  const entry = map[leadStatus] ?? { label: leadStatus, cls: "bg-gray-100 text-gray-600" };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.cls}`}>{entry.label}</span>;
}

function SafetyBadge({ flags }: { flags: string | null }) {
  if (!flags || flags === "none") return null;
  const list = flags.split(",").map(f => f.trim()).filter(Boolean);
  const labels: Record<string, string> = {
    pregnant: "🤰 Pregnant",
    breastfeeding: "🍼 Breastfeeding",
    injection_allergy: "💉 Allergy",
    medication: "💊 Medication",
    medical_condition: "🏥 Med. Condition",
  };
  return (
    <div className="flex flex-wrap gap-1">
      {list.map(f => (
        <span key={f} className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
          {labels[f] ?? f}
        </span>
      ))}
    </div>
  );
}

function StatCard({ emoji, label, value, highlight, sub }: { emoji: string; label: string; value: string | number; highlight?: boolean; sub?: string }) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <span className="text-xl">{emoji}</span>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) { setError("Mali ang username o password. Try again po."); return; }
      const { token } = await r.json() as { token: string };
      localStorage.setItem("admin_token", token);
      onLogin(token);
    } catch {
      setError("Something went wrong. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl mx-auto mb-4">💖</div>
          <h1 className="text-2xl font-bold text-foreground">La Julieta Beauty</h1>
          <p className="text-sm text-muted-foreground mt-1">Admin Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Enter password"
            />
          </div>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Message drawer ───────────────────────────────────────────────────────────
function MessageDrawer({ client, token, onClose }: { client: Client; token: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ messages: Message[] }>(`/clients/${client.psid}/messages`, token)
      .then(d => setMessages(d.messages))
      .finally(() => setLoading(false));
  }, [client.psid, token]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-background w-full max-w-md h-full flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{client.name ?? `User •••${client.psid.slice(-6)}`}</p>
            <p className="text-xs text-muted-foreground">{client.mobile ?? "No mobile recorded"}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {client.concern && (
                <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">
                  Concern: {client.concern.replace(/_/g, " ")}
                </span>
              )}
              {client.recommended_service && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  Rec: {client.recommended_service}
                </span>
              )}
              <SafetyBadge flags={client.safety_flags} />
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none shrink-0">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No messages recorded yet.</p>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.direction === "outbound"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {messages.length} messages · First contact: {new Date(client.created_at).toLocaleDateString("en-PH")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Filter type ──────────────────────────────────────────────────────────────
type FilterMode =
  | "all"
  | "booking_requested"
  | "escalated"
  | "skin_concern_inquiry"
  | "safety_flagged"
  | "pregnant"
  | "injection_allergy"
  | "confirmed"
  | "needs_followup";

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [menuSetupStatus, setMenuSetupStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const webhookUrl = `${WEBHOOK_BASE}${WEBHOOK_PATH}`;

  const buildQuery = (f: FilterMode) => {
    if (f === "all") return "/clients";
    if (f === "pregnant") return "/clients?safety_flag=pregnant";
    if (f === "injection_allergy") return "/clients?safety_flag=injection_allergy";
    if (["booking_requested", "escalated", "skin_concern_inquiry", "safety_flagged"].includes(f))
      return `/clients?lead_status=${f}`;
    if (f === "confirmed") return "/clients?status=confirmed";
    if (f === "needs_followup") return "/clients?status=needs_followup";
    return "/clients";
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsData, statsData] = await Promise.all([
        apiGet<{ clients: Client[] }>(buildQuery(filter), token),
        apiGet<Stats>("/stats", token),
      ]);
      setClients(clientsData.clients);
      setStats(statsData);
    } catch {
      onLogout();
    } finally {
      setLoading(false);
    }
  }, [filter, token, onLogout]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (psid: string, status: string) => {
    await fetch(`/api/admin/clients/${psid}/status`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const setupPersistentMenu = async () => {
    setMenuSetupStatus("loading");
    try {
      const r = await fetch("/api/admin/setup-persistent-menu", {
        method: "POST",
        headers: authHeaders(token),
      });
      setMenuSetupStatus(r.ok ? "ok" : "error");
    } catch {
      setMenuSetupStatus("error");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST", headers: authHeaders(token) });
    localStorage.removeItem("admin_token");
    onLogout();
  };

  const filtered = clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.mobile ?? "").includes(q) ||
      (c.service ?? "").toLowerCase().includes(q) ||
      (c.concern ?? "").toLowerCase().includes(q)
    );
  });

  const filterButtons: { key: FilterMode; label: string }[] = [
    { key: "all",                  label: "All" },
    { key: "booking_requested",    label: "📅 Booking Requests" },
    { key: "escalated",            label: "🔔 Talk to Agent" },
    { key: "skin_concern_inquiry", label: "✨ Skin Concerns" },
    { key: "safety_flagged",       label: "⚠️ Safety Flags" },
    { key: "pregnant",             label: "🤰 Pregnant" },
    { key: "injection_allergy",    label: "💉 Injection Allergy" },
    { key: "confirmed",            label: "✅ Confirmed" },
    { key: "needs_followup",       label: "🔔 Follow-up" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {selectedClient && (
        <MessageDrawer client={selectedClient} token={token} onClose={() => setSelectedClient(null)} />
      )}

      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white text-lg shrink-0">💖</div>
            <div>
              <p className="font-bold text-sm leading-none">La Julieta Beauty</p>
              <p className="text-xs text-muted-foreground">Client Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={setupPersistentMenu}
              disabled={menuSetupStatus === "loading"}
              className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-50"
              title="Set up Messenger persistent menu"
            >
              {menuSetupStatus === "loading" ? "Setting…" : menuSetupStatus === "ok" ? "Menu Set ✓" : menuSetupStatus === "error" ? "Menu Error ✗" : "Setup Menu"}
            </button>
            <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard emoji="👥" label="Total Clients" value={stats.total} />
            <StatCard emoji="📅" label="Bookings" value={stats.bookings} highlight />
            <StatCard emoji="✅" label="Confirmed" value={stats.confirmed} highlight />
            <StatCard emoji="🔔" label="Talk to Agent" value={stats.escalated} />
            <StatCard emoji="✨" label="Skin Concerns" value={stats.skin_concerns} />
            <StatCard emoji="⚠️" label="Safety Flagged" value={stats.safety_flagged} />
            <StatCard emoji="💬" label="Inquiries" value={stats.inquiries} />
            <StatCard emoji="🔁" label="For Follow-up" value={stats.needs_followup} />
          </div>
        )}

        {/* Webhook URL */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Messenger & Instagram Webhook URL</p>
            <code className="text-sm font-mono text-foreground break-all">{webhookUrl}</code>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="shrink-0 text-xs px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold"
          >
            Copy
          </button>
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            {filterButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                  filter === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, mobile, service, concern…"
              className="flex-1 border border-border rounded-xl px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button onClick={load} className="shrink-0 text-xs px-4 py-2 border border-border rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {search ? "No clients match your search." : "Walang clients pa."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {["Client", "Contact", "Concern / Service", "Booking", "Safety", "Lead Status", "Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-secondary/40 transition-colors">

                      {/* Client */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedClient(c)}
                          className="text-left hover:text-primary transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground">
                              {c.name ?? <span className="text-muted-foreground">User •••{c.psid.slice(-6)}</span>}
                            </p>
                            <span
                              title={c.channel === "instagram" ? "Instagram" : "Messenger"}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.channel === "instagram" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"}`}
                            >
                              {c.channel === "instagram" ? "IG" : "FB"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.updated_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[140px]">{c.last_message ?? ""}</p>
                        </button>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {c.mobile ?? "—"}
                      </td>

                      {/* Concern / Service */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {c.concern && (
                            <span className="text-xs text-pink-700 font-medium">
                              🎯 {c.concern.replace(/_/g, " ")}
                            </span>
                          )}
                          {c.service && (
                            <span className="text-xs text-muted-foreground">{c.service}</span>
                          )}
                          {c.recommended_service && !c.service && (
                            <span className="text-[10px] text-blue-600">Rec: {c.recommended_service}</span>
                          )}
                          {!c.concern && !c.service && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>

                      {/* Booking */}
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {c.booking_date ? `${c.booking_date}` : "—"}
                        {c.booking_time ? <><br />{c.booking_time}</> : null}
                        {c.reference_no ? <><br /><span className="text-emerald-700 font-medium">#{c.reference_no}</span></> : null}
                      </td>

                      {/* Safety */}
                      <td className="px-4 py-3">
                        <SafetyBadge flags={c.safety_flags} />
                        {(!c.safety_flags || c.safety_flags === "none") && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Lead Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <LeadBadge leadStatus={c.lead_status} />
                          <StatusBadge status={c.status} />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedClient(c)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-secondary transition-colors"
                          >
                            Chat
                          </button>
                          {c.status !== "confirmed" && (
                            <button
                              onClick={() => updateStatus(c.psid, "confirmed")}
                              className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              ✓ Confirm
                            </button>
                          )}
                          {c.status !== "needs_followup" && (
                            <button
                              onClick={() => updateStatus(c.psid, "needs_followup")}
                              className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              Follow-up
                            </button>
                          )}
                          {c.status !== "cancelled" && (
                            <button
                              onClick={() => updateStatus(c.psid, "cancelled")}
                              className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          La Julieta Beauty Parañaque © {new Date().getFullYear()} ·{" "}
          <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
        </p>
      </main>
    </div>
  );
}

// ─── Privacy Policy ───────────────────────────────────────────────────────────
function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white text-lg shrink-0">💖</div>
            <div>
              <p className="font-bold text-sm leading-none">La Julieta Beauty</p>
              <p className="text-xs text-muted-foreground">Privacy Policy</p>
            </div>
          </div>
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</a>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8 text-foreground">
        <div>
          <h1 className="text-3xl font-bold mb-1">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: April 20, 2026</p>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          La Julieta Beauty Parañaque ("we", "our", "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your information when you interact with us through Facebook Messenger and our booking system.
        </p>
        {[
          { title: "1. Information We Collect", body: <ul className="list-disc list-inside space-y-1 text-muted-foreground"><li>Full name</li><li>Mobile number</li><li>Appointment details (service, date, time)</li><li>Skin concerns and preferences shared voluntarily</li><li>Facebook public profile information</li></ul> },
          { title: "2. How We Use Your Information", body: <ul className="list-disc list-inside space-y-1 text-muted-foreground"><li>Process and manage appointment bookings</li><li>Recommend appropriate treatments</li><li>Communicate with you regarding your inquiries</li><li>Improve our services and customer experience</li></ul> },
          { title: "3. Data Sharing", body: <p className="text-muted-foreground leading-relaxed">We do not sell or rent your personal information. We may share your information only when necessary with internal staff of La Julieta Beauty Parañaque and service providers (e.g., booking systems such as AnyPlusPro).</p> },
          { title: "4. Data Storage and Security", body: <p className="text-muted-foreground leading-relaxed">We take reasonable measures to protect your information from unauthorized access, disclosure, or misuse. However, no online system is completely secure.</p> },
          { title: "5. Your Rights", body: <><p className="text-muted-foreground leading-relaxed mb-2">You may request to access, correct, or delete your personal data by contacting us.</p></> },
          { title: "6. Contact Us", body: <p className="text-muted-foreground leading-relaxed">For any privacy-related concerns, please reach out to us through our Facebook Page: La Julieta Beauty Parañaque.</p> },
        ].map(({ title, body }) => (
          <div key={title}>
            <h2 className="text-lg font-bold mb-3">{title}</h2>
            {body}
          </div>
        ))}
      </main>
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("admin_token"));
  const [page, setPage] = useState<"dashboard" | "privacy">(() =>
    window.location.pathname === "/privacy-policy" ? "privacy" : "dashboard"
  );

  useEffect(() => {
    const onPop = () => setPage(window.location.pathname === "/privacy-policy" ? "privacy" : "dashboard");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (page === "privacy") return <PrivacyPolicy />;
  if (!token) return <LoginScreen onLogin={setToken} />;
  return <Dashboard token={token} onLogout={() => setToken(null)} />;
}
