const SkillsTicker = () => {
  const rowA = [
    "React 19",
    "TypeScript",
    "Vite",
    "Tailwind CSS 4",
    "GSAP",
    "Three.js",
    "Node.js",
    "Express.js",
  ];
  const rowB = [
    "SQLite",
    "REST APIs",
    "Git",
    "Figma",
    "HTML5",
    "CSS3",
    "JavaScript",
    "Bootstrap",
  ];

  const Pill = ({ skill }) => (
    <div className="flex items-center gap-3 px-5 py-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-ember/30 transition-colors duration-300">
      <div className="w-1.5 h-1.5 rounded-full bg-ember" />
      <span className="font-display font-semibold text-xs text-text-muted tracking-widest select-none uppercase">
        {skill}
      </span>
    </div>
  );

  return (
    <section
      id="skills"
      className="relative w-full py-12 bg-void border-y border-white/5 overflow-hidden z-10 flex flex-col gap-4"
    >
      {/* Label */}
      <div className="px-6 md:px-12 mb-2">
        <span className="font-display text-text-muted text-[10px] uppercase tracking-[0.3em] font-semibold">
          — Teknologi &amp; Alat
        </span>
      </div>

      {/* Row A: left */}
      <div className="ticker-wrap flex">
        <div className="ticker flex gap-6 py-1">
          {[...rowA, ...rowA].map((skill, index) => (
            <Pill key={`a-${index}`} skill={skill} />
          ))}
        </div>
      </div>

      {/* Row B: right (reverse) */}
      <div className="ticker-wrap flex">
        <div className="ticker ticker-rev flex gap-6 py-1">
          {[...rowB, ...rowB].map((skill, index) => (
            <Pill key={`b-${index}`} skill={skill} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SkillsTicker;
