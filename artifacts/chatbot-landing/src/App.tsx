import { useState, useEffect, useCallback } from "react";

const WEBHOOK_BASE = window.location.origin;
const WEBHOOK_PATH = "/webhook";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id: number;
  psid: string;
  name: string | null;
  mobile: string | null;
  status: "inquiry" | "confirmed" | "needs_followup" | "cancelled";
  last_message: string | null;
  service: string | null;
  booking_date: string | null;
  booking_time: string | null;
  reference_no: string | null;
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
  inquiries: string;
  confirmed: string;
  needs_followup: string;
  total: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const r = await fetch(`/api/admin${path}`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<T>;
}

// ─── Components ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Client["status"] }) {
  const map: Record<Client["status"], { label: string; cls: string }> = {
    inquiry: { label: "Inquiry", cls: "bg-blue-100 text-blue-700" },
    confirmed: { label: "Confirmed ✓", cls: "bg-emerald-100 text-emerald-700" },
    needs_followup: { label: "Follow-up", cls: "bg-amber-100 text-amber-700" },
    cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
  };
  const { label, cls } = map[status] ?? map.inquiry;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
  );
}

function StatCard({ emoji, label, value, highlight }: { emoji: string; label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-1 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
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
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground">{client.name ?? `PSID: ${client.psid.slice(-6)}`}</p>
            <p className="text-xs text-muted-foreground">{client.mobile ?? "No mobile recorded"}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
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
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<"all" | "inquiry" | "confirmed" | "needs_followup">("all");
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");

  const webhookUrl = `${WEBHOOK_BASE}${WEBHOOK_PATH}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsData, statsData] = await Promise.all([
        apiGet<{ clients: Client[] }>(`/clients${filter !== "all" ? `?status=${filter}` : ""}`, token),
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

  const updateStatus = async (psid: string, status: Client["status"]) => {
    await fetch(`/api/admin/clients/${psid}/status`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST", headers: authHeaders(token) });
    localStorage.removeItem("admin_token");
    onLogout();
  };

  const filtered = clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name ?? "").toLowerCase().includes(q) ||
      (c.mobile ?? "").includes(q) ||
      (c.service ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background">
      {selectedClient && (
        <MessageDrawer client={selectedClient} token={token} onClose={() => setSelectedClient(null)} />
      )}

      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white text-lg shrink-0">💖</div>
            <div>
              <p className="font-bold text-sm leading-none">La Julieta Beauty</p>
              <p className="text-xs text-muted-foreground">Client Dashboard</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard emoji="👥" label="Total clients" value={stats.total} />
            <StatCard emoji="💬" label="Inquiries" value={stats.inquiries} />
            <StatCard emoji="✅" label="Confirmed" value={stats.confirmed} highlight />
            <StatCard emoji="🔔" label="For follow-up" value={stats.needs_followup} />
          </div>
        )}

        {/* Webhook URL */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Facebook Webhook URL</p>
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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-wrap">
            {(["all", "inquiry", "confirmed", "needs_followup"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors ${
                  filter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {{ all: "All", inquiry: "Inquiries", confirmed: "Confirmed", needs_followup: "Follow-up" }[s]}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, mobile, service…"
            className="flex-1 border border-border rounded-xl px-4 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button onClick={load} className="shrink-0 text-xs px-4 py-2 border border-border rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
            ↻ Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {search ? "No clients match your search." : "Walang clients pa. Clients will appear here once they message your page."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Client", "Mobile", "Service", "Booking", "Status", "Last Message", "Actions"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedClient(c)}
                          className="text-left hover:text-primary transition-colors"
                        >
                          <p className="font-medium text-foreground">{c.name ?? <span className="text-muted-foreground">FB User •••{c.psid.slice(-6)}</span>}</p>
                          <p className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.mobile ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.service ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {c.booking_date ? `${c.booking_date} ${c.booking_time ?? ""}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{c.last_message ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedClient(c)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-secondary transition-colors"
                          >
                            Messages
                          </button>
                          {c.status !== "confirmed" && (
                            <button
                              onClick={() => updateStatus(c.psid, "confirmed")}
                              className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              Confirm
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
          {
            title: "1. Information We Collect",
            body: (
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Full name</li>
                <li>Mobile number</li>
                <li>Appointment details (service, date, time)</li>
                <li>Facebook public profile information (such as name and profile ID)</li>
              </ul>
            ),
          },
          {
            title: "2. How We Use Your Information",
            body: (
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Process and manage appointment bookings</li>
                <li>Communicate with you regarding your inquiries or reservations</li>
                <li>Provide customer support</li>
                <li>Improve our services and customer experience</li>
              </ul>
            ),
          },
          {
            title: "3. Data Sharing",
            body: (
              <p className="text-muted-foreground leading-relaxed">
                We do not sell or rent your personal information. We may share your information only when necessary with internal staff of La Julieta Beauty Parañaque and service providers (e.g., booking systems such as AnyPlusPro).
              </p>
            ),
          },
          {
            title: "4. Data Storage and Security",
            body: (
              <p className="text-muted-foreground leading-relaxed">
                We take reasonable measures to protect your information from unauthorized access, disclosure, or misuse. However, no online system is completely secure, and we cannot guarantee absolute security.
              </p>
            ),
          },
          {
            title: "5. Your Rights",
            body: (
              <>
                <p className="text-muted-foreground leading-relaxed mb-2">You may request to:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-2">To make a request, please contact us using the details below.</p>
              </>
            ),
          },
          {
            title: "6. Use of Facebook Messenger",
            body: (
              <p className="text-muted-foreground leading-relaxed">
                Our chatbot operates on Facebook Messenger. By interacting with our page, you also agree to Facebook's Data Policy. We only access the information necessary to respond to your inquiries and manage bookings.
              </p>
            ),
          },
          {
            title: "7. Third-Party Services",
            body: (
              <p className="text-muted-foreground leading-relaxed">
                We may use third-party tools (such as booking systems or automation platforms) to process your information securely. These services have their own privacy policies.
              </p>
            ),
          },
          {
            title: "8. Changes to This Policy",
            body: (
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.
              </p>
            ),
          },
        ].map(({ title, body }) => (
          <section key={title} className="space-y-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            {body}
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">9. Contact Us</h2>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">La Julieta Beauty Parañaque</p>
            <p>
              Facebook:{" "}
              <a
                href="https://www.facebook.com/Lajulietabeautyparanaque"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                facebook.com/Lajulietabeautyparanaque
              </a>
            </p>
            <p>
              Email:{" "}
              <a href="mailto:laizeltesporlas@gmail.com" className="text-primary hover:underline">
                laizeltesporlas@gmail.com
              </a>
            </p>
            <p>
              Phone:{" "}
              <a href="tel:+639156156588" className="text-primary hover:underline">
                +63 915 615 6588
              </a>
            </p>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground pt-4">
          La Julieta Beauty Parañaque © {new Date().getFullYear()}
        </p>
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("admin_token"));

  const handleLogin = (t: string) => setToken(t);
  const handleLogout = () => { localStorage.removeItem("admin_token"); setToken(null); };

  if (window.location.pathname === "/privacy-policy") return <PrivacyPolicy />;
  if (!token) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
