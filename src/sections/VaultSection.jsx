import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { Lock, X } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const VaultSection = () => {
  const sectionRef = useRef(null);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", reason: "" });

  const vaultProjects = [
    {
      code: "Project NOVA",
      category: "Web App / SaaS",
      desc: "Alat yang mengubah cara developer mengelola alur kerja. Masih mode senyap.",
      status: "IN DEV",
      est: "Q3 2025",
    },
    {
      code: "Project GRID",
      category: "Dashboard / Admin Panel",
      desc: "Dashboard analitik lengkap dengan visualisasi data real-time. Hampir rampung.",
      status: "BETA",
      est: "Q4 2025",
    },
    {
      code: "Project REALM",
      category: "Game / Interactive",
      desc: "Pengalaman browser interaktif. Setengah game, setengah seni.",
      status: "CONCEPT",
      est: "TBD",
    },
    {
      code: "Project ARC",
      category: "Dashboard / Admin Panel",
      desc: "Alat internal yang dibangun ulang dari nol dengan design system yang rapi.",
      status: "TESTING",
      est: "TBD",
    },
  ];

  useGSAP(() => {
    // Fade and reveal section header
    gsap.fromTo(
      sectionRef.current.querySelector(".vault-header"),
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "cubic-bezier(0.16, 1, 0.3, 1)",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
      }
    );

    // Stagger cards reveal
    const cards = sectionRef.current.querySelectorAll(".vault-card");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.12,
        duration: 1.2,
        ease: "cubic-bezier(0.16, 1, 0.3, 1)",
        scrollTrigger: {
          trigger: ".vault-cards-grid",
          start: "top 75%",
        },
      }
    );
  }, []);

  const openRequestModal = (project) => {
    setActiveProject(project);
    setFormSubmitted(false);
    setFormData({ name: "", email: "", reason: "" });
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <section
      id="vault"
      ref={sectionRef}
      className="relative w-full min-h-screen py-24 px-6 md:px-12 flex flex-col justify-center items-center gap-16 overflow-hidden bg-void"
    >
      {/* Header */}
      <div className="vault-header w-full max-w-5xl flex flex-col items-center text-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/10 mb-2 text-text-muted">
          <Lock size={16} />
        </div>
        <h2 className="font-display font-bold text-3xl md:text-5xl text-text-primary tracking-tighter">
          Arsip Rahasia
        </h2>
        <p className="font-sans text-xs sm:text-sm text-text-muted max-w-lg mt-1">
          Konsep internal, framework belum rilis, dan eksperimen yang masih digodok dalam mode senyap.
        </p>
        <div className="w-16 h-[1px] bg-ember mt-4" />
      </div>

      {/* Vault Cards Grid */}
      <div className="vault-cards-grid w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {vaultProjects.map((p, idx) => (
          <div
            key={idx}
            className="vault-card glass-panel rounded-3xl p-8 flex flex-col justify-between min-h-[260px] relative overflow-hidden group border-white/5 bg-[#161615]/20 hover:glow-pulse transition-all duration-500"
          >
            {/* The Lock Overlay */}
            <div className="absolute inset-0 z-20 bg-void/90 flex flex-col justify-center items-center gap-3 transition-all duration-500 group-hover:opacity-0 group-hover:pointer-events-none border border-white/0 group-hover:border-white/5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/10 text-text-muted">
                <Lock size={16} />
              </div>
              <span className="text-[9px] font-display font-bold tracking-widest text-text-muted uppercase">
                Arsip Rahasia
              </span>
            </div>

            {/* Slow gradient overlay on hover */}
            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.01] to-white/[0.02] pointer-events-none" />

            {/* Card Content wrapper - blurs and reduces opacity when not hovered */}
            <div className="relative z-10 h-full flex flex-col justify-between gap-6 transition-all duration-500 filter blur-md opacity-20 group-hover:blur-none group-hover:opacity-100">
              
              {/* Upper section */}
              <div className="flex flex-col gap-4">
                {/* Category */}
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-0.5 rounded text-[9px] font-display font-bold uppercase tracking-wider border border-white/5 bg-white/[0.02] text-text-muted">
                    {p.category}
                  </span>
                  <span className="text-[10px] font-display font-semibold tracking-wider text-text-muted uppercase">
                    Est: {p.est}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="flex flex-col gap-2">
                  <h3 className="font-display font-bold text-lg text-text-primary">
                    {p.code}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>

              {/* Lower Section (Status / CTA button) */}
              <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-text-muted font-display uppercase tracking-wider">
                <span className="font-semibold">Status: <span className="text-text-primary/80">{p.status}</span></span>
                <button
                  onClick={() => openRequestModal(p)}
                  className="px-3 py-1 rounded border border-ember/40 hover:bg-ember hover:text-void transition-all duration-300 font-display text-[9px] font-semibold uppercase tracking-wider text-ember cursor-pointer"
                >
                  Ajukan Akses
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Glassmorphic Request Modal */}
      {modalOpen && activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div 
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-void/85 backdrop-blur-sm transition-opacity duration-300"
          />
          
          {/* Content panel */}
          <div className="editorial-panel relative z-10 w-full max-w-md rounded-3xl p-8 shadow-2xl border-white/5 bg-[#161615] flex flex-col gap-6 animate-[modalIntro_0.4s_cubic-bezier(0.16,1,0.3,1)]">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes modalIntro {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}} />
            
            {/* Header / Close */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-ember" />
                <span className="font-display text-[10px] uppercase font-bold tracking-widest text-text-muted">
                  Formulir Akses
                </span>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-text-muted hover:text-white transition-colors p-1"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Project Code Banner */}
            <div className="py-2.5 px-4 rounded bg-white/[0.02] border border-white/5 flex justify-between items-center text-xs font-display">
              <span className="text-text-muted">Target Projek:</span>
              <span className="text-text-primary font-bold">{activeProject.code}</span>
            </div>

            {!formSubmitted ? (
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="name" className="font-display text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                    Nama Kamu
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded border border-white/5 bg-white/[0.01] text-white focus-ring focus:border-ember/40 text-xs font-sans"
                    placeholder="Budi Santoso"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="font-display text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded border border-white/5 bg-white/[0.01] text-white focus-ring focus:border-ember/40 text-xs font-sans"
                    placeholder="budi@gmail.com"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="reason" className="font-display text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                    Alasan Meminta Akses
                  </label>
                  <textarea
                    id="reason"
                    required
                    rows={3}
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded border border-white/5 bg-white/[0.01] text-white focus-ring focus:border-ember/40 text-xs font-sans resize-none"
                    placeholder="Jelasin kenapa kamu butuh akses awal/uji coba..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-2 rounded bg-ember text-void font-display font-semibold uppercase tracking-wider text-[10px] hover:bg-white hover:text-black transition-colors duration-300 cursor-pointer"
                >
                  Kirim Permintaan
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center text-center gap-4 py-4 animate-[successIntro_0.4s_ease-out]">
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes successIntro {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                `}} />
                <div className="w-12 h-12 rounded-full bg-ember/10 border border-ember/20 flex items-center justify-center text-ember">
                  <Lock size={20} className="animate-pulse" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-display font-bold text-sm text-white">Permintaan Terkirim</span>
                  <p className="font-sans text-xs text-text-muted leading-relaxed px-4">
                    Permintaan akses kamu sudah dicatat. Token autentikasi bakal dikirim ke <span className="text-white/90">{formData.email}</span>.
                  </p>
                </div>
                <div className="w-full flex justify-center mt-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-2 border border-white/10 hover:border-white/20 rounded text-[10px] font-display font-semibold uppercase tracking-wider text-text-primary transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default VaultSection;
