import IndiaMap from "./components/IndiaMapLoader";
import EmergencyAnalyst from "./components/EmergencyAnalyst";
import CommandCenter from "./components/CommandCenter";
import IncidentPriorityQueue from "./components/IncidentPriorityQueue";
import CorrelationEngine from "./components/CorrelationEngine";
import SystemHealth from "./components/SystemHealth";
import AlertNotificationCenter from "./components/AlertNotificationCenter";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      {/* ALERT NOTIFICATION CENTER */}
      <AlertNotificationCenter />

      <div className="mx-auto max-w-[1600px] px-6 py-10">

        {/* HEADER */}
        <header className="mb-8">
          <p className="mb-3 text-sm font-medium tracking-[0.35em] text-red-400">
            AI BHARAT
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Emergency Intelligence
          </h1>

          <p className="mt-3 text-lg text-slate-400">
            Real-time India emergency monitoring platform
          </p>
        </header>

        {/* INDIA INTELLIGENCE MAP */}
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#090d14] shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
            <div>
              <p className="text-xs font-medium tracking-[0.3em] text-slate-500">
                LIVE OPERATIONS
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                India Intelligence Map
              </h2>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              LIVE
            </div>
          </div>

          <IndiaMap />
        </section>

        {/* COMMAND CENTER */}
        <CommandCenter />

        {/* INCIDENT PRIORITY QUEUE */}
        <IncidentPriorityQueue />

        {/* ADVANCED CORRELATION ENGINE */}
        <CorrelationEngine />

        {/* SYSTEM HEALTH */}
        <SystemHealth />

        {/* AI EMERGENCY ANALYST */}
        <EmergencyAnalyst />

        {/* OFFICIAL ALERTS */}
        <section className="mt-8 rounded-3xl border border-red-500/20 bg-[#090d14] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.3em] text-red-400">
                OFFICIAL ALERTS
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Government Emergency Alerts
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Official disaster warnings from authorized government sources
              </p>
            </div>

            <div className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-400">
              NDMA SACHET
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-2xl">
                🚨
              </div>

              <div>
                <h3 className="font-semibold">
                  Official alert feed
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  This section is reserved for verified disaster alerts
                  published through the NDMA SACHET system. Dashboard-derived
                  weather risk is kept separate from official government
                  warnings.
                </p>

                <a
                  href="https://sachet.ndma.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
                >
                  Open NDMA SACHET →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* DATA SOURCES */}
        <section className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="rounded-full border border-slate-800 px-4 py-2">
            Weather: Open-Meteo
          </span>

          <span className="rounded-full border border-slate-800 px-4 py-2">
            Official Alerts: NDMA SACHET
          </span>

          <span className="rounded-full border border-slate-800 px-4 py-2">
            Map: OpenStreetMap
          </span>
        </section>

      </div>
    </main>
  );
}