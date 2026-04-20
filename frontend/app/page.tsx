import type { Metadata } from "next";
import Link from "next/link";

const siteUrl = "https://global-digital-twin-frontend.vercel.app";

export const metadata: Metadata = {
  title: "IoT Digital Twin Platform",
  description:
    "Zenith Digital Twin is a real-time IoT and industrial monitoring platform for telemetry dashboards, anomaly detection, 3D device visibility, and connected operations.",
  alternates: {
    canonical: "/",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Zenith Digital Twin",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description:
    "A real-time digital twin platform for IoT telemetry, industrial monitoring, anomaly detection, and device-level operational visibility.",
  creator: {
    "@type": "Person",
    name: "Ahmed Hadi",
  },
  featureList: [
    "IoT device telemetry dashboard",
    "Anomaly detection",
    "Device alert history",
    "3D digital twin visualization",
    "Failure simulation controls",
    "Device detail pages",
  ],
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,217,184,0.12),_transparent_34%),linear-gradient(180deg,_#08131b_0%,_#04090e_100%)] text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              Zenith Digital Twin
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Real-time IoT monitoring, anomaly detection, and digital twin visibility
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-slate-300">
              Explore a production-style digital twin platform built for connected
              devices, industrial telemetry, embedded systems, and device-level
              operational visibility. The platform combines real-time monitoring,
              alerts, analytics, and an interactive 3D twin experience.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Open Demo
            </Link>
            <a
              href="https://github.com/AhmedHadi77/global-digital-twin"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/[0.04]"
            >
              View Source
            </a>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            [
              "IoT and Embedded Systems",
              "Built around connected-device telemetry, sensor data flow, and real-time operational state.",
            ],
            [
              "Distributed Monitoring",
              "Tracks multiple simulated devices across locations with persistent alerts, readings, and status history.",
            ],
            [
              "Full-Stack Product Delivery",
              "Combines Next.js, Node.js, PostgreSQL, Socket.IO, and 3D visualization into one deployable platform.",
            ],
          ].map(([title, description]) => (
            <div
              key={title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-slate-300">{description}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-8">
            <h2 className="text-2xl font-semibold text-white">What this platform does</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "Real-time device telemetry dashboard",
                "Anomaly detection and alert tracking",
                "Historical device readings",
                "3D digital twin device visualization",
                "Device detail pages",
                "Failure simulation controls",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-8">
            <h2 className="text-2xl font-semibold text-white">Tech stack</h2>
            <ul className="mt-6 space-y-3 text-slate-300">
              <li>Next.js 16 and React 19 frontend</li>
              <li>Node.js, Express, and Socket.IO backend</li>
              <li>PostgreSQL persistence for devices, readings, and alerts</li>
              <li>Three.js and React Three Fiber for 3D twin views</li>
              <li>IoT-inspired telemetry simulation and control actions</li>
            </ul>

            <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
              <p className="text-sm text-cyan-100">
                This public page is optimized for search indexing. The live
                operational dashboard remains protected behind login.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
