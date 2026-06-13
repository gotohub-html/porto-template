import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { ExternalLink, Folder, Star } from "lucide-react";

// Inline Github Icon Component
const GithubIcon = ({ size = 20, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

gsap.registerPlugin(ScrollTrigger);

const featuredRepos = [
  {
    name: "roblox-script-hub",
    description: "Script eksekusi Lua & indeks katalog yang dioptimalkan.",
    language: "Lua",
    stars: 12,
  },
  {
    name: "portfolio-v2",
    description: "Showcase portfolio menggunakan React, GSAP, Tailwind & Three.js.",
    language: "JavaScript",
    stars: 8,
  },
  {
    name: "mini-utilities",
    description: "Script Python mandiri buat otomatisasi alur kerja dev.",
    language: "Python",
    stars: 15,
  },
];

// ---- Card 1: LumeHub ----
const LumeHubCard = () => (
  <div className="project-card editorial-panel editorial-card iridescent-border rounded-3xl p-8 md:p-10 flex flex-col justify-between min-h-[480px] group relative overflow-hidden">
    <div>
      <div className="flex justify-between items-center mb-8 relative z-10">
        <span className="px-3 py-1 rounded-md text-[10px] font-display font-semibold border border-white/5 bg-[#161615]/30 text-text-muted uppercase tracking-wider">
          Web App / SaaS
        </span>
        <a
          href="https://lumehub.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-ember transition-colors flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wider"
        >
          <span>Buka Web</span>
          <ExternalLink
            size={12}
            className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
          />
        </a>
      </div>

      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/5 group-hover:border-ember/30 group-hover:bg-white/5 transition-colors duration-300">
          <Folder
            className="text-text-muted group-hover:text-ember transition-colors"
            size={18}
          />
        </div>
        <h3 className="font-display font-bold text-xl md:text-2xl text-text-primary group-hover:text-white transition-colors">
          LumeHub
        </h3>
      </div>

      <p className="font-sans text-sm text-text-muted leading-relaxed mb-8 relative z-10">
        Script hub Roblox canggih dengan tampilan gelap dan minimalis. Mengatur node eksekusi, mengontrol latensi, dan menyediakan lapisan sesi terenkripsi untuk proses eksekusi yang aman.
      </p>
    </div>

    <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5 relative z-10">
      {["JavaScript", "Tailwind CSS", "Vercel", "Next.js"].map((tech, i) => (
        <span
          key={i}
          className="px-2.5 py-1 rounded-md text-[11px] font-sans font-medium bg-[#161615]/20 text-text-muted border border-white/5 hover:border-ember/30 hover:text-white transition-colors duration-300"
        >
          {tech}
        </span>
      ))}
    </div>
  </div>
);

// ---- Card 2: GitHub ----
const GithubCard = () => (
  <div className="project-card editorial-panel editorial-card iridescent-border rounded-3xl p-8 md:p-10 flex flex-col justify-between min-h-[480px] group relative overflow-hidden">
    <div>
      <div className="flex justify-between items-center mb-8 relative z-10">
        <span className="px-3 py-1 rounded-md text-[10px] font-display font-semibold border border-white/5 bg-[#161615]/30 text-text-muted uppercase tracking-wider">
          Open Source
        </span>
        <a
          href="https://github.com/danixbo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-ember transition-colors flex items-center gap-1.5 text-xs font-display font-semibold uppercase tracking-wider"
        >
          <span>Repositori</span>
          <GithubIcon
            size={12}
            className="group-hover:scale-110 transition-transform duration-300"
          />
        </a>
      </div>

      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/5 group-hover:border-ember/30 group-hover:bg-white/5 transition-colors duration-300">
          <GithubIcon
            className="text-text-muted group-hover:text-ember transition-colors"
            size={18}
          />
        </div>
        <h3 className="font-display font-bold text-xl md:text-2xl text-text-primary group-hover:text-white transition-colors">
          Direktori GitHub
        </h3>
      </div>

      <p className="font-sans text-sm text-text-muted leading-relaxed mb-6 relative z-10">
        Kumpulan script open source, eksperimen front-end, dan otomatisasi. Tempat coret-coret digital buat menguji alat sebelum dirilis.
      </p>

      <div className="grid grid-cols-1 gap-2.5 mb-8 relative z-10">
        {featuredRepos.map((repo, i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300 flex justify-between items-center"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-display font-semibold text-xs text-text-primary hover:text-ember transition-colors cursor-pointer">
                {repo.name}
              </span>
              <span className="font-sans text-[10px] text-text-muted max-w-[260px] sm:max-w-xs truncate">
                {repo.description}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
              <span className="font-sans font-medium">{repo.language}</span>
              <span className="flex items-center gap-1">
                <Star size={10} className="text-ember" />
                <span>{repo.stars}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5 relative z-10">
      {["Python", "JavaScript", "HTML/CSS", "Bootstrap"].map((tech, i) => (
        <span
          key={i}
          className="px-2.5 py-1 rounded-md text-[11px] font-sans font-medium bg-[#161615]/20 text-text-muted border border-white/5 hover:border-ember/30 hover:text-white transition-colors duration-300"
        >
          {tech}
        </span>
      ))}
    </div>
  </div>
);

const ProjectsSection = () => {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    // Desktop: horizontal pinned scroll
    mm.add("(min-width: 1024px)", () => {
      const track = trackRef.current;
      const totalScroll = track.scrollWidth - window.innerWidth;

      const tween = gsap.to(track, {
        x: -totalScroll,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${totalScroll + window.innerHeight * 0.5}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Subtle entrance for each card, driven by the horizontal container tween
      gsap.utils.toArray(".project-card", track).forEach((card) => {
        gsap.from(card, {
          opacity: 0,
          scale: 0.94,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            containerAnimation: tween,
            start: "left 80%",
            end: "left 40%",
            scrub: true,
          },
        });
      });
    });

    // Mobile/Tablet: simple vertical fade up in scroll trigger
    mm.add("(max-width: 1023px)", () => {
      const cards = sectionRef.current.querySelectorAll(".project-card");
      gsap.fromTo(
        cards,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative w-full h-auto lg:h-screen lg:overflow-hidden bg-void py-24 lg:py-0"
    >
      <div
        ref={trackRef}
        className="flex flex-col lg:flex-row lg:items-center lg:h-full lg:w-max will-change-transform px-6 md:px-12 lg:px-0 gap-16 lg:gap-0"
      >
        {/* Intro panel */}
        <div className="pin-panel flex-shrink-0 w-full lg:w-screen h-auto lg:h-full flex flex-col justify-center px-0 lg:px-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-ember glow-pulse" />
            <span className="font-display text-text-muted text-xs uppercase tracking-widest font-semibold">
              — Karya Pilihan
            </span>
          </div>
          <h2 className="font-display font-bold text-4xl lg:text-7xl tracking-tighter max-w-xl leading-[95%]">
            <span className="text-text-primary">Karya yang </span>
            <span className="iridescent-text">gua rilis.</span>
          </h2>
          <p className="font-sans text-sm text-text-muted mt-6 max-w-sm">
            Scroll terus — karyanya bakal geser ke samping. Dua web aktif, satu buku coretan digital.
          </p>
          
          {/* Desktop-only scroll line */}
          <div className="hidden lg:flex items-center gap-2 mt-8 text-text-muted text-[10px] uppercase tracking-widest font-display font-semibold">
            <span>Scroll</span>
            <div className="w-12 h-px bg-white/10 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full w-1/3 bg-ember"
                style={{ animation: "scrollLine 2s linear infinite" }}
              />
            </div>
            <span>→</span>
          </div>
        </div>

        {/* Project panels */}
        <div className="pin-panel flex-shrink-0 w-full lg:w-[min(560px,85vw)] h-auto lg:h-full flex items-center lg:px-6">
          <div className="w-full">
            <LumeHubCard />
          </div>
        </div>
        <div className="pin-panel flex-shrink-0 w-full lg:w-[min(560px,85vw)] h-auto lg:h-full flex items-center lg:px-6">
          <div className="w-full">
            <GithubCard />
          </div>
        </div>

        {/* Outro spacer panel */}
        <div className="pin-panel flex-shrink-0 hidden lg:flex w-[40vw] h-full items-center justify-center">
          <span className="font-display text-text-muted/40 text-sm uppercase tracking-[0.3em] -rotate-90 whitespace-nowrap">
            Arsip lainnya di bawah →
          </span>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes scrollLine { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`,
        }}
      />
    </section>
  );
};

export default ProjectsSection;
