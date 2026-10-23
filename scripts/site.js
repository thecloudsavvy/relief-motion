document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("menu-toggle");
  const drawer = document.getElementById("nav-drawer");
  toggle?.addEventListener("click", () => {
    const open = drawer.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  drawer?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      drawer.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });

  document.querySelectorAll("form.enquire").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const to = form.getAttribute("data-to") || "info@reliefmotionphysio.com";
      const subject = form.getAttribute("data-subject") || "Relief Motion enquiry";
      const lines = [...new FormData(form).entries()]
        .map(([key, value]) => `${key}: ${String(value).trim()}`)
        .filter((line) => !line.endsWith(":"));
      const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
      window.location.href = href;
    });
  });

  const track = document.getElementById("quote-track");
  const dots = document.getElementById("quote-dots");
  if (!track || !dots) return;

  const slides = [...track.children];
  const prev = document.getElementById("quote-prev");
  const next = document.getElementById("quote-next");
  let index = 0;
  let timer;

  const go = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    [...dots.children].forEach((dot, i) => {
      if (i === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  };

  slides.forEach((_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Show slide ${i + 1}`);
    button.addEventListener("click", () => go(i));
    dots.appendChild(button);
  });

  prev?.addEventListener("click", () => go(index - 1));
  next?.addEventListener("click", () => go(index + 1));
  go(0);
  timer = setInterval(() => go(index + 1), 7000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInterval(timer);
    else timer = setInterval(() => go(index + 1), 7000);
  });
});
