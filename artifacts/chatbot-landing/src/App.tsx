import { useState, useEffect } from "react";

const WEBHOOK_BASE = window.location.origin;
const WEBHOOK_PATH = "/webhook";

function StatusDot({ online }: { online: boolean | null }) {
  if (online === null) return (
    <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
  );
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-400"}`}
    />
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function StepCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="font-semibold text-foreground mb-1">{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [online, setOnline] = useState<boolean | null>(null);
  const webhookUrl = `${WEBHOOK_BASE}${WEBHOOK_PATH}`;

  useEffect(() => {
    fetch("/api/healthz")
      .then((r) => setOnline(r.ok))
      .catch(() => setOnline(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white text-lg">
              💖
            </div>
            <div>
              <p className="font-bold text-sm leading-none">La Julieta Beauty</p>
              <p className="text-xs text-muted-foreground">Parañaque</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <StatusDot online={online} />
            <span className="text-muted-foreground font-medium">
              {online === null ? "Checking…" : online ? "Chatbot online" : "Chatbot offline"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
            <StatusDot online={online} />
            Messenger Chatbot
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            La Julieta Beauty Chatbot
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            A warm, Taglish-speaking Messenger assistant that handles bookings, services, promos, and customer inquiries for your aesthetic clinic.
          </p>
        </div>

        {/* Webhook URL */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            🔗 Your Webhook URL
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste this into your Facebook App → Messenger → Settings → Webhooks:
          </p>
          <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
            <code className="text-sm font-mono text-foreground flex-1 break-all">
              {webhookUrl}
            </code>
            <CopyButton value={webhookUrl} />
          </div>
        </div>

        {/* Features */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-foreground">✨ What the chatbot can do</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { emoji: "📅", label: "Book appointments" },
              { emoji: "💆", label: "Show services list" },
              { emoji: "🎉", label: "Share current promos" },
              { emoji: "👩", label: "Transfer to staff" },
              { emoji: "🌸", label: "Warm Taglish replies" },
              { emoji: "✏️", label: "Edit before confirming" },
            ].map(({ emoji, label }) => (
              <div key={label} className="flex items-center gap-2.5 bg-secondary rounded-xl px-3.5 py-2.5">
                <span>{emoji}</span>
                <span className="text-foreground font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Services */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-foreground">💅 Services the bot knows about</h2>
          <div className="flex flex-wrap gap-2">
            {["HydraFacial", "Laser Hair Removal", "Chemical Peel", "Facial Treatment",
              "RF Skin Tightening", "Microneedling", "Botox / Filler", "Whitening Drip"].map((s) => (
              <span key={s} className="text-xs bg-accent text-accent-foreground font-medium px-3 py-1.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Facebook Setup Steps */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-foreground">🚀 Facebook Setup Steps</h2>
          <div className="space-y-5">
            <StepCard number={1} title="Go to Facebook Developer Console">
              Visit <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">developers.facebook.com</a> → Your App → Messenger → Settings
            </StepCard>
            <StepCard number={2} title="Add the webhook">
              Under <strong>Webhooks</strong>, click <strong>Add Callback URL</strong>. Paste the webhook URL above and enter your <code className="bg-secondary px-1 rounded">VERIFY_TOKEN</code> secret.
            </StepCard>
            <StepCard number={3} title="Subscribe to events">
              Subscribe to <code className="bg-secondary px-1 rounded">messages</code> and <code className="bg-secondary px-1 rounded">messaging_postbacks</code>.
            </StepCard>
            <StepCard number={4} title="Add testers (Development Mode)">
              Go to <strong>Roles → Testers</strong> and add people who should be able to test the bot right now, before App Review.
            </StepCard>
            <StepCard number={5} title="Submit for App Review (to go public)">
              Request <code className="bg-secondary px-1 rounded">pages_messaging</code> permission. Clinic booking bots are approved quickly. Upload a short video demo of the conversation flow.
            </StepCard>
          </div>
        </div>

        {/* Booking Flow */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-foreground">🗺️ Booking Conversation Flow</h2>
          <div className="flex flex-col gap-2 text-sm">
            {[
              "User says hi → Warm welcome message",
              "Choose intent: Book / Services / Promos / Talk to Staff",
              "Pick a service from quick reply buttons",
              "Type preferred date (e.g. 'bukas', 'April 25', 'Saturday')",
              "Type preferred time (e.g. '2pm', '10am')",
              "Enter full name",
              "Enter mobile number",
              "Review summary → Confirm or Edit",
              "Booking confirmed with reference number 🎉",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 bg-secondary rounded-xl px-3.5 py-2.5">
                <span className="text-muted-foreground font-mono text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="border-t border-border mt-16 py-6">
        <p className="text-center text-xs text-muted-foreground">
          La Julieta Beauty Parañaque — Messenger Chatbot © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
