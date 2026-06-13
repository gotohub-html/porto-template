import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { Send, Mail } from "lucide-react";

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

const ContactSection = () => {
  const containerRef = useRef(null);

  useGSAP(() => {
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
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Pesan terkirim. Makasih ya udah ngehubungin!");
  };

  return (
    <section
      id="contact"
      className="relative w-full min-h-screen py-24 px-6 md:px-12 flex justify-center items-center overflow-hidden bg-void"
    >
      <div
        ref={containerRef}
        className="editorial-panel relative z-10 w-full max-w-4xl rounded-3xl p-8 md:p-14 shadow-md grid grid-cols-1 lg:grid-cols-5 gap-12 border-white/5 bg-[#161615]/10"
      >
        {/* Contact info column */}
        <div className="lg:col-span-2 flex flex-col justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-ember" />
              <span className="font-display text-text-muted text-xs uppercase tracking-widest font-semibold">
                Hubungi Gue
              </span>
            </div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-text-primary tracking-tighter">
              Yuk, bikin sesuatu bareng-bareng.
            </h2>
            <div className="w-16 h-[1px] bg-ember mt-2" />
            <p className="font-sans text-sm text-text-muted leading-relaxed mt-4">
              Ada pertanyaan, tawaran project, atau cuma mau ngobrol-ngobrol santai? Kirim aja form di samping atau hubungi lewat media sosial di bawah.
            </p>
          </div>

          {/* Social connections */}
          <div className="flex flex-col gap-4">
            <span className="font-display text-[10px] text-text-muted uppercase tracking-widest font-semibold">
              Medsos &amp; Kontak
            </span>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/danixbo"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/5 hover:border-ember/40 hover:bg-ember/5 text-text-primary hover:text-ember transition-all duration-300"
                aria-label="GitHub"
              >
                <GithubIcon size={16} />
              </a>
              <a
                href="https://guns.lol/noblondzzz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/5 hover:border-ember/40 hover:bg-ember/5 text-text-primary hover:text-ember transition-all duration-300 font-display font-bold text-xs"
                aria-label="Guns.lol"
              >
                G
              </a>
              <a
                href="mailto:contact@danixbo.dev"
                className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/[0.02] border border-white/5 hover:border-ember/40 hover:bg-ember/5 text-text-primary hover:text-ember transition-all duration-300"
                aria-label="Email"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Message form column */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="font-display text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Nama Kamu
            </label>
            <input
              type="text"
              id="name"
              required
              className="w-full px-4 py-3 rounded-lg border border-white/5 bg-white/[0.01] text-white focus-ring focus:border-ember/40 focus:bg-white/[0.02] transition-all duration-300 text-sm font-sans"
              placeholder="Dani"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-display text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Alamat Email
            </label>
            <input
              type="email"
              id="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-white/5 bg-white/[0.01] text-white focus-ring focus:border-ember/40 focus:bg-white/[0.02] transition-all duration-300 text-sm font-sans"
              placeholder="dani@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="font-display text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Pesan Kamu
            </label>
            <textarea
              id="message"
              required
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-white/5 bg-white/[0.01] text-white focus-ring focus:border-ember/40 focus:bg-white/[0.02] transition-all duration-300 text-sm font-sans resize-none"
              placeholder="Tulis pesan atau detail project kamu di sini..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-lg font-display font-semibold uppercase tracking-wider text-xs bg-ember text-void flex items-center justify-center gap-2 hover:bg-amber hover:text-text-primary transition-colors duration-300 hover:scale-[1.005] active:scale-[0.995] cursor-pointer"
          >
            <span>Kirim Pesan</span>
            <Send size={12} />
          </button>
        </form>
      </div>
    </section>
  );
};

export default ContactSection;
