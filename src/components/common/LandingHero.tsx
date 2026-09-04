interface LandingHeroProps {
  onStart: () => void;
  onLoadPersona: (name: 'priya' | 'ravi' | 'anita') => void;
}

export default function LandingHero({ onStart, onLoadPersona }: LandingHeroProps) {
  return (
    <div className="max-w-4xl mx-auto pt-1 sm:pt-2 pb-16">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-3 mb-3.5">
          <span className="h-px w-6 bg-[#5a2045]/30" />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5a2045]">
            Independent Financial Self-Assessment
          </span>
          <span className="h-px w-6 bg-[#5a2045]/30" />
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#18181b] tracking-tight leading-[1.18] sm:leading-[1.15] mb-4 sm:mb-5">
          <span className="font-serif italic font-normal text-[1.08em] tracking-tight text-[#18181b]">
            Should you borrow more?
          </span>{" "}
          <br />
          <span className="text-[#5a2045]">Know what is actually safe.</span>
        </h1>
        <p className="text-base sm:text-xl text-[#52525b] font-medium tracking-tight px-2">
          Unbiased numbers before you apply.
        </p>

        {/* Primary CTA */}
        <div className="mt-6 sm:mt-8 mb-3 px-2">
          <button
            onClick={onStart}
            className="w-full sm:w-auto bg-[#5a2045] hover:bg-[#481837] text-white font-semibold text-base px-8 sm:px-9 py-3.5 sm:py-4 rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            Start Self-Assessment →
          </button>
        </div>
        <p className="text-xs text-[#71717a] px-2">
          ⚡ ~8 core questions · Takes under 2 minutes · Works offline
        </p>
      </div>

      {/* Cardless Editorial Flow: 5 Key Deliverables */}
      <div className="border-y border-[#eae3d9] py-6 sm:py-8 my-8 sm:my-10">
        <p className="text-[11px] font-bold text-[#5a2045] uppercase tracking-widest text-center mb-5 sm:mb-6">
          What You Get in 2 Minutes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#eae3d9]">
          <div className="sm:px-3 py-2.5 sm:py-0">
            <span className="text-xs font-bold text-[#5a2045] tracking-widest block mb-0.5 sm:mb-1">01</span>
            <h4 className="text-sm font-bold text-[#18181b]">Clear Verdict</h4>
            <p className="text-xs text-[#71717a] mt-0.5 sm:mt-1 leading-snug">Borrow, Borrow Less, or Don't Borrow</p>
          </div>
          <div className="sm:px-3 py-2.5 sm:py-0">
            <span className="text-xs font-bold text-[#5a2045] tracking-widest block mb-0.5 sm:mb-1">02</span>
            <h4 className="text-sm font-bold text-[#18181b]">Lender-Likely</h4>
            <p className="text-xs text-[#71717a] mt-0.5 sm:mt-1 leading-snug">What banks would probably approve</p>
          </div>
          <div className="sm:px-3 py-2.5 sm:py-0">
            <span className="text-xs font-bold text-[#5a2045] tracking-widest block mb-0.5 sm:mb-1">03</span>
            <h4 className="text-sm font-bold text-[#18181b]">Borrower-Safe</h4>
            <p className="text-xs text-[#71717a] mt-0.5 sm:mt-1 leading-snug">What you can carry after a buffer</p>
          </div>
          <div className="sm:px-3 py-2.5 sm:py-0">
            <span className="text-xs font-bold text-[#5a2045] tracking-widest block mb-0.5 sm:mb-1">04</span>
            <h4 className="text-sm font-bold text-[#18181b]">Fair Rate Band</h4>
            <p className="text-xs text-[#71717a] mt-0.5 sm:mt-1 leading-snug">The benchmark rate to negotiate</p>
          </div>
          <div className="sm:px-3 py-2.5 sm:py-0">
            <span className="text-xs font-bold text-[#5a2045] tracking-widest block mb-0.5 sm:mb-1">05</span>
            <h4 className="text-sm font-bold text-[#18181b]">EMI Ceiling</h4>
            <p className="text-xs text-[#71717a] mt-0.5 sm:mt-1 leading-snug">The non-negotiable monthly cap</p>
          </div>
        </div>
      </div>

      {/* Instant Demo Switcher (Clean Pill Row - No Cards) */}
      <div className="text-center pt-1 sm:pt-2">
        <span className="text-xs font-semibold text-[#71717a] uppercase tracking-wider block mb-3">
          Or preview with an instant sample profile
        </span>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 sm:gap-2.5 max-w-md sm:max-w-none mx-auto">
          {[
            {
              id: 'priya' as const,
              name: 'Priya',
              role: 'Salaried IT (₹1.1L/mo)',
              outcome: 'Borrow Less',
            },
            {
              id: 'ravi' as const,
              name: 'Ravi',
              role: 'Kirana Business (LAP)',
              outcome: 'Borrow Less',
            },
            {
              id: 'anita' as const,
              name: 'Anita',
              role: 'Gig Worker (High Debt)',
              outcome: "Don't Borrow",
            },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => onLoadPersona(p.id)}
              className="flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-full border border-[#eae3d9] bg-white hover:border-[#5a2045] hover:bg-[#faf4f8] transition-all cursor-pointer text-xs group shadow-xs w-full sm:w-auto active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#f4e7f0] text-[#5a2045] font-bold flex items-center justify-center text-[11px] group-hover:bg-[#5a2045] group-hover:text-white transition-colors">
                  {p.name[0]}
                </span>
                <span className="font-semibold text-[#18181b]">{p.name}</span>
                <span className="text-[#71717a] text-[11px] sm:text-xs">· {p.role}</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#faf7f2] border border-[#eae3d9] text-[#5a2045] ml-auto">
                {p.outcome} →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
