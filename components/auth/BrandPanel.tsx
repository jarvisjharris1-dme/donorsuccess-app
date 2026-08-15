import { HeartHandshake, LineChart, Target } from 'lucide-react';

const NODES = [
  { cx: 60, cy: 90, r: 4, delay: '0s' },
  { cx: 160, cy: 60, r: 3, delay: '0.6s' },
  { cx: 130, cy: 180, r: 5, delay: '1.2s' },
  { cx: 240, cy: 140, r: 3.5, delay: '1.8s' },
  { cx: 90, cy: 260, r: 4, delay: '0.3s' },
  { cx: 210, cy: 250, r: 3, delay: '2.1s' },
  { cx: 40, cy: 340, r: 3.5, delay: '0.9s' },
  { cx: 260, cy: 340, r: 4.5, delay: '1.5s' },
];

const EDGES = [
  [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 6], [5, 7], [2, 5],
];

const VALUE_PROPS = [
  { icon: HeartHandshake, label: 'Donor CRM & health scoring' },
  { icon: LineChart, label: 'Major gifts pipeline & forecasting' },
  { icon: Target, label: 'Success plans for every relationship' },
];

export default function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-evergreen to-[#0b4a44] lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:p-12">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 300 420"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="#5EEAD4" strokeWidth="1" opacity="0.35">
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].cx}
              y1={NODES[a].cy}
              x2={NODES[b].cx}
              y2={NODES[b].cy}
            />
          ))}
        </g>
        {NODES.map((n, i) => (
          <circle
            key={i}
            className="network-node network-node-drift"
            style={{ animationDelay: n.delay, transformOrigin: `${n.cx}px ${n.cy}px` }}
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill="#5EEAD4"
          />
        ))}
      </svg>

      <div className="relative z-10 flex items-center gap-2.5">
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="5" fill="#5EEAD4" />
          <circle cx="30" cy="10" r="4" fill="#99F6E4" />
          <circle cx="36" cy="24" r="3.2" fill="#5EEAD4" />
          <circle cx="16" cy="30" r="6" fill="#5EEAD4" />
          <path
            d="M14 14 L16 30 M14 14 L30 10 M30 10 L36 24 M16 30 L36 24"
            stroke="#99F6E4"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[15px] font-extrabold leading-[1.05] text-white">
          DONOR<span className="block font-black text-teal">SUCCESS</span>
        </span>
      </div>

      <div className="relative z-10">
        <h1 className="font-display text-[34px] font-extrabold leading-[1.12] text-white">
          Grow Donors.
          <br />
          Grow Giving.
          <br />
          Grow Impact.
        </h1>
        <p className="mt-4 max-w-[320px] text-[15px] text-white/70">
          The intelligent platform for cultivating donor relationships that
          last.
        </p>
      </div>

      <div className="relative z-10 flex flex-col gap-3.5">
        {VALUE_PROPS.map((vp) => (
          <div key={vp.label} className="flex items-center gap-3 text-white/85">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
              <vp.icon size={15} />
            </div>
            <span className="text-[13.5px] font-medium">{vp.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
