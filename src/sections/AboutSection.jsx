import { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";

gsap.registerPlugin(ScrollTrigger);

const AboutSection = () => {
  const containerRef = useRef(null);
  const statsRef = useRef(null);

  const [stability, setStability] = useState(99.84);
  const [humOffset, setHumOffset] = useState(0);
  const [lat, setLat] = useState("6.5569° S");
  const [lng, setLng] = useState("107.4429° E");

  useEffect(() => {
    const interval = setInterval(() => {
      setStability((prev) => {
        const delta = (Math.random() - 0.5) * 0.06;
        const next = prev + delta;
        if (Math.random() > 0.98) {
          setTimeout(() => {
            setStability(99.0 + Math.random() * 0.9);
          }, 300);
          return parseFloat((40.0 + Math.random() * 20).toFixed(2));
        }
        return parseFloat(Math.min(99.99, Math.max(98.1, next)).toFixed(2));
      });
      setHumOffset((Math.random() - 0.5) * 0.15);
    }, 1200);

    const coordInterval = setInterval(() => {
      const randomLat = (Math.random() * 180 - 90).toFixed(4);
      const latDir = Math.random() > 0.5 ? "N" : "S";
      setLat(`${Math.abs(randomLat)}° ${latDir}`);

      const randomLng = (Math.random() * 360 - 180).toFixed(4);
      const lngDir = Math.random() > 0.5 ? "E" : "W";
      setLng(`${Math.abs(randomLng)}° ${lngDir}`);
    }, 180);

    return () => {
      clearInterval(interval);
      clearInterval(coordInterval);
    };
  }, []);

  const stats = [
    { label: "Project Selesai", value: 7, suffix: "+" },
    { label: "Aplikasi Full-Stack", value: 3, suffix: "" },
    { label: "Alat Berbasis AI", value: 2, suffix: "+" },
    { label: "Mimpi Besar", value: 1, suffix: "" },
  ];

  const skillGroups = [
    {
      title: "Frontend",
      skills: ["React 19", "TypeScript", "Vite", "TailwindCSS", "Framer Motion", "CSS Grid/Flexbox"],
    },
    {
      title: "Backend",
      skills: ["Node.js", "Express.js", "SQLite", "REST APIs"],
    },
    {
      title: "AI & Data",
      skills: ["AI Integration", "Recharts", "Data Visualizations"],
    },
    {
      title: "Tools & Config",
      skills: ["Git / GitHub", "ESLint", "PostCSS", "Figma design"],
    },
  ];

  useGSAP(() => {
    // Fade and slide up container
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "cubic-bezier(0.16, 1, 0.3, 1)",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
      }
    );

    // Count up animation for stats
    const statElements = statsRef.current.querySelectorAll(".stat-number");
    statElements.forEach((el) => {
      const target = parseInt(el.getAttribute("data-target"), 10);
      const obj = { val: 0 };
      
      gsap.to(obj, {
        val: target,
        duration: 2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: statsRef.current,
          start: "top 85%",
        },
        onUpdate: () => {
          el.innerText = Math.floor(obj.val);
        },
      });
    });
  }, []);

  return (
    <section id="about" className="relative w-full min-h-screen py-24 px-6 md:px-12 flex justify-center items-center bg-void">
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-5xl flex flex-col gap-16"
      >
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-ember" />
            <span className="font-display text-text-muted text-xs uppercase tracking-widest font-semibold">
              — Biografi
            </span>
          </div>
          <h2 className="font-display font-bold text-3xl md:text-5xl text-text-primary tracking-tighter">
            Cuma iseng coding, <span className="iridescent-text">keterusan bikin sesuatu.</span>
          </h2>
          <div className="w-16 h-[1px] bg-gradient-to-r from-ember to-amber mt-2" />
        </div>

        {/* Bio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          {/* Main Description */}
          <div className="lg:col-span-3 flex flex-col gap-6 font-sans text-text-muted leading-relaxed text-base md:text-lg">
            <p>
              Gua <span className="text-text-primary font-semibold">Dani</span>, developer &amp; designer otodidak dari <span className="censor-reveal relative inline-block font-semibold text-text-primary px-1.5 cursor-none group select-none">
                <span className="blur-sm group-hover:blur-none transition-all duration-300 text-text-muted group-hover:text-text-primary">
                  Purwakarta
                </span>
                <span className="absolute inset-y-1 left-0 right-0 z-10 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_6px,#0d0d0c_6px,#0d0d0c_12px)] border border-amber-500/20 select-none pointer-events-none transform -skew-y-1 rotate-1 opacity-100 group-hover:opacity-0 group-hover:scale-y-0 transition-all duration-300 origin-center" />
              </span>, Indonesia. Gua suka bikin website yang rapi—dari tampilan front-end sampai API backend yang enteng.
            </p>
            <p>
              Di portfolio ini, gua gabungin apa yang gua suka: layout yang bersih dan animasi yang pas. Biasanya pakai TypeScript sama React.
            </p>
            <p className="text-text-muted/70 text-sm md:text-base border-l border-ember pl-4 italic">
              Gak usah banyak omong, langsung liat project gua aja.
            </p>
          </div>

          {/* Dimensional Anchor / Location Card */}
          <div 
            className="lg:col-span-2 p-8 rounded-2xl border border-white/5 bg-[#161615]/30 flex flex-col justify-between min-h-[230px] shadow-sm relative overflow-hidden group"
          >
            {/* Animated scan line overlay */}
            <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-ember/40 to-transparent pointer-events-none card-scan-line" />
            
            {/* Grid overlay for a terminal look */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            <div className="flex flex-col gap-1 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-ember text-xs font-semibold uppercase tracking-wider font-display flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${stability > 90 ? 'bg-ember glow-pulse' : 'bg-red-500 animate-ping'}`} />
                  Jangkar Dimensi
                </span>
                <span className="font-mono text-[9px] text-text-muted tracking-widest">
                  {stability > 90 ? 'TERKUNCI' : 'HANYUT'}
                </span>
              </div>
              
              <div className="mt-2 flex flex-col items-start">
                <div className="relative inline-block select-none">
                  <p className="font-display font-semibold text-lg tracking-tight text-text-muted/40 blur-[2px] pr-2">
                    Purwakarta Gateway
                  </p>
                  <span className="absolute inset-y-1.5 left-0 right-0 z-10 bg-[repeating-linear-gradient(-45deg,#f59e0b,#f59e0b_6px,#0d0d0c_6px,#0d0d0c_12px)] border border-amber-500/20 select-none pointer-events-none transform -skew-y-1 rotate-1 opacity-100 origin-center" />
                </div>
                <p className="text-[10px] font-mono text-text-muted mt-0.5 lowercase tracking-normal">
                  &gt; status sistem: realitas terkunci
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 mt-4 border-t border-white/5 font-display text-[9px] text-text-muted uppercase tracking-wider font-semibold relative z-10">
              <div className="flex flex-col">
                <span>Stabilitas Inti</span>
                <span className={`font-mono mt-0.5 text-xs font-normal transition-colors duration-300 ${stability > 90 ? 'text-text-primary' : 'text-ember font-bold'}`}>
                  {stability}%
                </span>
              </div>
              <div className="flex flex-col">
                <span>Frekuensi Listrik</span>
                <span className="text-text-primary font-mono mt-0.5 text-xs font-normal">
                  {(60 + humOffset).toFixed(2)} Hz
                </span>
              </div>
              <div className="flex flex-col">
                <span>Garis Lintang</span>
                <span className="text-text-primary font-mono mt-0.5 text-xs font-normal">
                  {lat}
                </span>
              </div>
              <div className="flex flex-col">
                <span>Garis Bujur</span>
                <span className="text-text-primary font-mono mt-0.5 text-xs font-normal">
                  {lng}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-y border-white/5 stats-container"
        >
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1">
              <span className="font-display font-bold text-4xl md:text-5xl text-text-primary tracking-tighter">
                <span className="stat-number text-ember" data-target={stat.value}>0</span>
                <span className="text-text-muted font-normal text-3xl">{stat.suffix}</span>
              </span>
              <span className="font-sans text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Skill Chips Grid */}
        <div className="flex flex-col gap-6">
          <h3 className="font-display font-bold text-lg text-text-primary uppercase tracking-wider">Tech Stack</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skillGroups.map((group, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-white/5 bg-[#161615]/10 flex flex-col gap-4"
              >
                <span className="font-display text-xs font-semibold tracking-wider uppercase text-text-primary/80 border-b border-white/5 pb-2">
                  {group.title}
                </span>
                <div className="flex flex-wrap gap-2">
                  {group.skills.map((skill, sj) => (
                    <span
                      key={sj}
                      className="px-2.5 py-1 rounded-md text-[11px] font-sans font-medium bg-white/[0.01] text-text-muted border border-white/5 hover:border-ember/20 hover:text-white transition-colors duration-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subtle Bottom Affordance */}
        <div className="w-full text-center mt-4">
          <p className="font-display text-[9px] text-text-muted tracking-widest uppercase">
            Masih tahap didevelop. Ntar kalo ada project baru gua update.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
