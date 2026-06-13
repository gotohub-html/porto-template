import { useEffect, useRef } from "react";
import gsap from "gsap";

const CustomCursor = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    // Check if device is mobile or touch-enabled
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice || window.innerWidth < 768) {
      if (dotRef.current) dotRef.current.style.display = "none";
      if (ringRef.current) ringRef.current.style.display = "none";
      return;
    }

    const dot = dotRef.current;
    const ring = ringRef.current;
    const handle = ring?.querySelector(".cursor-handle");

    const onMouseMove = (e) => {
      const { clientX: x, clientY: y } = e;

      // Position the dot instantly
      gsap.to(dot, {
        x: x - 3,
        y: y - 3,
        duration: 0.1,
      });

      // Position the ring with a slight delay
      gsap.to(ring, {
        x: x - 14,
        y: y - 14,
        duration: 0.3,
        ease: "power3.out",
      });
    };

    const onMouseEnterLink = () => {
      gsap.to(ring, {
        scale: 1.6,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.08)",
        duration: 0.3,
      });
      gsap.to(dot, {
        scale: 0.5,
        backgroundColor: "#f59e0b",
        duration: 0.3,
      });
    };

    const onMouseLeaveLink = () => {
      gsap.to(ring, {
        scale: 1,
        borderColor: "#e0533c",
        backgroundColor: "transparent",
        duration: 0.3,
      });
      gsap.to(dot, {
        scale: 1,
        backgroundColor: "#e0533c",
        duration: 0.3,
      });
    };

    const onMouseEnterCensor = () => {
      gsap.to(ring, {
        scale: 1.5,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(13, 13, 12, 0.45)",
        backdropFilter: "blur(1.5px)",
        webkitBackdropFilter: "blur(1.5px)",
        duration: 0.3,
      });
      gsap.to(dot, {
        scale: 0,
        opacity: 0,
        duration: 0.2,
      });
      if (handle) {
        gsap.to(handle, {
          scale: 1,
          rotation: 45,
          opacity: 1,
          duration: 0.3,
        });
      }
    };

    const onMouseLeaveCensor = () => {
      gsap.to(ring, {
        scale: 1,
        borderColor: "#e0533c",
        backgroundColor: "transparent",
        backdropFilter: "blur(0px)",
        webkitBackdropFilter: "blur(0px)",
        duration: 0.3,
      });
      gsap.to(dot, {
        scale: 1,
        opacity: 1,
        duration: 0.3,
      });
      if (handle) {
        gsap.to(handle, {
          scale: 0,
          rotation: 45,
          opacity: 0,
          duration: 0.2,
        });
      }
    };

    window.addEventListener("mousemove", onMouseMove);

    // Find and attach to interactive elements
    const attachHoverEvents = () => {
      const links = document.querySelectorAll("a, button, [role='button'], input[type='submit'], .project-card, .vault-card");
      links.forEach((link) => {
        link.addEventListener("mouseenter", onMouseEnterLink);
        link.addEventListener("mouseleave", onMouseLeaveLink);
      });

      const censors = document.querySelectorAll(".censor-reveal");
      censors.forEach((censor) => {
        censor.addEventListener("mouseenter", onMouseEnterCensor);
        censor.addEventListener("mouseleave", onMouseLeaveCensor);
      });
    };

    // Delay attach slightly to allow DOM to render
    const timeoutId = setTimeout(attachHoverEvents, 500);

    // Re-attach elements when DOM changes
    const observer = new MutationObserver(attachHoverEvents);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      clearTimeout(timeoutId);
      observer.disconnect();
      
      const links = document.querySelectorAll("a, button, [role='button'], input[type='submit'], .project-card, .vault-card");
      links.forEach((link) => {
        link.removeEventListener("mouseenter", onMouseEnterLink);
        link.removeEventListener("mouseleave", onMouseLeaveLink);
      });

      const censors = document.querySelectorAll(".censor-reveal");
      censors.forEach((censor) => {
        censor.removeEventListener("mouseenter", onMouseEnterCensor);
        censor.removeEventListener("mouseleave", onMouseLeaveCensor);
      });
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-ember rounded-full pointer-events-none z-[9999]"
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-7 h-7 border border-ember rounded-full pointer-events-none z-[9998] flex items-center justify-center"
      >
        {/* Magnifying glass handle */}
        <div className="cursor-handle absolute left-[23.9px] top-[23.9px] w-3.5 h-[2px] bg-amber rotate-45 rounded-sm opacity-0 scale-0 origin-top-left" />
      </div>
    </>
  );
};

export default CustomCursor;
