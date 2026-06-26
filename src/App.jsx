import { useState, lazy, Suspense, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger, ScrollSmoother } from "gsap/all";

import NavBar from "./components/NavBar";
import CustomCursor from "./components/CustomCursor";
import SoundGate from "./components/SoundGate";
// Lazy-loaded: the lobby itself is light, but it further lazy-loads the BACK2ROOM
// cutscene + game (Three.js) only once the visitor noclips through the tape door.
const BackroomsLobby = lazy(() => import("./components/BackroomsLobby"));
import HeroSection from "./sections/HeroSection";
import ShowreelSection from "./sections/ShowreelSection";
import AboutSection from "./sections/AboutSection";
import ProjectsSection from "./sections/ProjectsSection";
import VaultSection from "./sections/VaultSection";
import SkillsTicker from "./sections/SkillsTicker";
import ContactSection from "./sections/ContactSection";
import FooterSection from "./sections/FooterSection";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

const App = () => {
  const [entered, setEntered] = useState(false);
  const [conceptMode, setConceptMode] = useState("main"); // 'main' | 'backrooms'
  const [devMode, setDevMode] = useState(false);
  const [fps, setFps] = useState(0);

  // Dev Mode toggle and FPS counter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDevMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    let frameCount = 0;
    let lastTime = performance.now();
    let rafId;

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useGSAP(() => {
    // Initialise GSAP ScrollSmoother for fluid scroll physics
    ScrollSmoother.create({
      smooth: 1.5,
      effects: true,
      smoothTouch: 0.1,
    });
  }, []);

  // Control ScrollSmoother pause and ScrollTrigger refresh on mode change
  useGSAP(() => {
    const smoother = ScrollSmoother.get();
    if (smoother) {
      const isBackrooms = conceptMode === "backrooms";
      smoother.paused(isBackrooms);
      if (!isBackrooms) {
        // Reset scroll position and refresh all triggers
        window.scrollTo(0, 0);
        ScrollTrigger.refresh();
      }
    }
  }, [conceptMode]);

  // Once the SoundGate lifts away, fade the content in and refresh triggers
  const handleEnter = () => {
    setEntered(true);
    gsap.fromTo(
      "#smooth-content",
      { opacity: 0 },
      {
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        onComplete: () => ScrollTrigger.refresh(),
      }
    );
  };

  return (
    <>
      {/* Intro sound gate */}
      <SoundGate onEnter={handleEnter} conceptMode={conceptMode} />

      {/* Custom Mouse Cursor for Desktop Screens (Disabled in Backrooms mode) */}
      {conceptMode === "main" && <CustomCursor />}

      {/* Global Header (Hidden in Backrooms mode for complete immersion) */}
      {conceptMode === "main" && <NavBar conceptMode={conceptMode} setConceptMode={setConceptMode} />}

      {/* Retro Liminal Space View (code-split — loads Three.js on demand) */}
      {conceptMode === "backrooms" && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#9c8f4a] font-mono text-[#0c0b07]">
              <span className="text-sm tracking-[0.4em] uppercase animate-pulse">
                No-clipping…
              </span>
            </div>
          }
        >
          <BackroomsLobby setConceptMode={setConceptMode} />
        </Suspense>
      )}

      {/* Scroll Wrapper required by GSAP ScrollSmoother */}
      <div
        id="smooth-wrapper"
        className="bg-void text-text-primary"
        style={{ display: conceptMode === "backrooms" ? "none" : "block" }}
      >
        <div id="smooth-content" style={{ opacity: entered ? 1 : 0 }}>
          {/* Landing / Introduction */}
          <HeroSection />

          {/* Kinetic showreel highlight band */}
          <ShowreelSection />

          {/* Detailed Biography, Stats and Skills categorization */}
          <AboutSection />

          {/* Completed Works & Repositories (horizontal pinned) */}
          <ProjectsSection />

          {/* Confidential Works and Sneak Peaks */}
          <VaultSection />

          {/* Infinite Technology Loop Ticker */}
          <SkillsTicker />

          {/* Get in touch email Form and Social portals */}
          <ContactSection />

          {/* Brand details and Confetti Easter Egg */}
          <FooterSection />
        </div>
      </div>

      {/* Dev Mode Overlay */}
      {devMode && (
        <div className="fixed bottom-4 right-4 z-[100] bg-black/80 backdrop-blur-md border border-ember/50 p-4 rounded font-mono text-xs text-ember pointer-events-none">
          <div className="font-bold border-b border-ember/30 pb-1 mb-2">DEBUG MODE</div>
          <div className="flex justify-between gap-4"><span>FPS:</span> <span>{fps}</span></div>
          <div className="flex justify-between gap-4"><span>Mode:</span> <span>{conceptMode}</span></div>
          <div className="flex justify-between gap-4"><span>GSAP:</span> <span>Active</span></div>
          <div className="flex justify-between gap-4"><span>Three.js:</span> <span>{conceptMode === 'main' ? 'Canvas' : 'PBR'}</span></div>
        </div>
      )}
    </>
  );
};

export default App;

