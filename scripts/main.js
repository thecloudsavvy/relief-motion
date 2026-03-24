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

  // ── Global Floating WhatsApp Button ───────────
  const waBtn = document.createElement("a");
  
  let waText = "Hello%2C%20I%E2%80%99d%20like%20to%20book%20a%20session.";
  if (window.location.pathname.includes("online-consultation")) {
    waText = "Hello%2C%20I%E2%80%99d%20like%20to%20book%20an%20online%20physiotherapy%20consultation.";
  }
  
  waBtn.href = `https://wa.me/2349164944357?text=${waText}`;
  waBtn.target = "_blank";
  waBtn.className = "floating-whatsapp";
  waBtn.setAttribute("aria-label", "Chat on WhatsApp");
  waBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>`;
  document.body.appendChild(waBtn);
});
