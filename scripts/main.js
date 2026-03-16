/* ═══════════════════════════════════════════
   RELIEF MOTION — Main JavaScript
   ═══════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  // ── Sticky Nav ──────────────────────────────
  const nav = document.querySelector(".nav");
  const handleScroll = () => {
    if (window.scrollY > 40) {
      nav?.classList.add("scrolled");
    } else {
      nav?.classList.remove("scrolled");
    }
  };
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  // ── Mobile Hamburger ─────────────────────────
  const hamburger = document.getElementById("hamburger");
  const mobileNav = document.getElementById("mobile-nav");

  hamburger?.addEventListener("click", () => {
    hamburger.classList.toggle("open");
    mobileNav?.classList.toggle("open");
    document.body.style.overflow = mobileNav?.classList.contains("open")
      ? "hidden"
      : "";
  });

  // Close mobile nav on link click
  mobileNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      hamburger?.classList.remove("open");
      mobileNav?.classList.remove("open");
      document.body.style.overflow = "";
    });
  });

  // ── Active Nav Link ──────────────────────────
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a, .nav-mobile a").forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (
      linkPage === currentPage ||
      (currentPage === "" && linkPage === "index.html") ||
      (currentPage === "index.html" && linkPage === "index.html")
    ) {
      link.classList.add("active");
    }
  });

  // ── Scroll Animations ─────────────────────────
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
  );

  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

  // ── FAQ Accordion ─────────────────────────────
  document.querySelectorAll(".faq-question").forEach((question) => {
    question.addEventListener("click", () => {
      const item = question.closest(".faq-item");
      const isOpen = item.classList.contains("open");
      // close all
      document
        .querySelectorAll(".faq-item")
        .forEach((i) => i.classList.remove("open"));
      // toggle clicked
      if (!isOpen) item.classList.add("open");
    });
  });

  // ── Counter Animation ─────────────────────────
  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute("data-target"));
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent =
        Math.floor(current) + (el.getAttribute("data-suffix") || "");
    }, 16);
  };

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 },
  );

  document
    .querySelectorAll("[data-target]")
    .forEach((el) => counterObserver.observe(el));

  // ── Smooth scroll for anchor links ────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});
