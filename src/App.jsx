import { useState, lazy, Suspense } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger, ScrollSmoother } from "gsap/all";

import NavBar from "./components/NavBar";
import CustomCursor from "./components/CustomCursor";
import SoundGate from "./components/SoundGate";
// Lazy-loaded: pulls in Three.js + post-processing only when the visitor no-clips in
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
    </>
  );
};

export default App;

