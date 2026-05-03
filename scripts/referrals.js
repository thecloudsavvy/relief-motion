/* Referral multi-step form (static site).
   Generates a structured email handoff via mailto:. */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("referral-form");
  if (!form) return;

  const errorEl = document.getElementById("form-error");
  const previewEl = document.getElementById("referral-preview");

  const nextBtn = document.getElementById("next-step");
  const prevBtn = document.getElementById("prev-step");
  const submitBtn = document.getElementById("submit-referral");
  const saveDraftBtn = document.getElementById("save-draft");

  const stepPanels = Array.from(form.querySelectorAll(".step-panel"));
  const pills = Array.from(document.querySelectorAll("[data-step-pill]"));

  const DRAFT_KEY = "reliefmotion_referral_draft_v1";
  const REFERRAL_EMAIL = "reliefmotion.co@gmail.com";

  let step = 1;

  function setError(message) {
    if (!errorEl) return;
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function setStep(newStep) {
    step = Math.max(1, Math.min(5, newStep));

    stepPanels.forEach((panel) => {
      const s = Number(panel.getAttribute("data-step"));
      panel.hidden = s !== step;
    });

    pills.forEach((pill) => {
      pill.classList.toggle("active", Number(pill.getAttribute("data-step-pill")) === step);
    });

    prevBtn.disabled = step === 1;
    nextBtn.hidden = step === 5;
    submitBtn.hidden = step !== 5;

    setError("");

    const heading = stepPanels.find((p) => Number(p.getAttribute("data-step")) === step);
    const firstInput = heading?.querySelector("input, select, textarea");
    firstInput?.focus?.();

    if (step === 5) {
      previewEl.textContent = buildReferralText(readFormData());
    }
  }

  function readFormData() {
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = String(v || "").trim();
    data.consent = form.querySelector("#consent")?.checked ? "Yes" : "No";
    return data;
  }

  function validateStep(currentStep) {
    setError("");
    const panel = stepPanels.find((p) => Number(p.getAttribute("data-step")) === currentStep);
    if (!panel) return true;

    const requiredEls = Array.from(panel.querySelectorAll("[required]"));
    for (const el of requiredEls) {
      if (el.type === "checkbox") {
        if (!el.checked) {
          setError("Please confirm consent/authorisation to share clinical information.");
          el.focus();
          return false;
        }
      } else if (!String(el.value || "").trim()) {
        const label = panel.querySelector(`label[for="${el.id}"]`);
        setError(`${label?.textContent?.replace("*", "").trim() || "This field"} is required.`);
        el.focus();
        return false;
      }
    }

    // Basic email format check where present on step 1
    if (currentStep === 1) {
      const email = String(document.getElementById("referrerEmail")?.value || "").trim();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        setError("Please enter a valid clinician email address.");
        document.getElementById("referrerEmail")?.focus();
        return false;
      }
    }

    return true;
  }

  function buildReferralText(data) {
    const lines = [];
    lines.push("RELIEF MOTION — CLINICAL REFERRAL");
    lines.push("");
    lines.push("REFERRER");
    lines.push(`- Name: ${data.referrerName || "-"}`);
    lines.push(`- Role/Specialty: ${data.referrerRole || "-"}`);
    lines.push(`- Facility/Organisation: ${data.referrerFacility || "-"}`);
    lines.push(`- Email: ${data.referrerEmail || "-"}`);
    lines.push(`- Phone: ${data.referrerPhone || "-"}`);
    lines.push(`- Reporting preference: ${data.reportPreference || "-"}`);
    lines.push("");
    lines.push("PATIENT");
    lines.push(`- Name/Initials: ${data.patientName || "-"}`);
    lines.push(`- DOB/Age: ${data.patientDOB || "-"}`);
    lines.push(`- Sex: ${data.patientSex || "-"}`);
    lines.push(`- Phone (patient/caregiver): ${data.patientPhone || "-"}`);
    lines.push("");
    lines.push("CLINICAL");
    lines.push(`- Primary diagnosis: ${data.primaryDx || "-"}`);
    lines.push(`- ICD-10: ${data.icd10 || "-"}`);
    lines.push("- Clinical summary:");
    lines.push(`${data.clinicalSummary || "-"}`);
    lines.push("");
    lines.push("- Precautions/contraindications:");
    lines.push(`${data.precautions || "-"}`);
    lines.push("");
    lines.push("- Referral goals:");
    lines.push(`${data.goals || "-"}`);
    lines.push("");
    lines.push("LOGISTICS");
    lines.push(`- Preferred model: ${data.careModel || "-"}`);
    lines.push(`- Location: ${data.location || "-"}`);
    lines.push(`- Urgency: ${data.urgency || "-"}`);
    lines.push(`- Preferred visit window: ${data.availability || "-"}`);
    lines.push("");
    lines.push(`CONSENT CONFIRMED: ${data.consent}`);
    lines.push("");
    lines.push("Notes:");
    lines.push("- Patient identifiers may be provided during intake confirmation if preferred.");
    return lines.join("\n");
  }

  function saveDraft() {
    const data = readFormData();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, savedAt: Date.now() }));
      setError("Draft saved on this device.");
      window.setTimeout(() => setError(""), 2500);
    } catch {
      setError("Unable to save draft in this browser.");
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const data = parsed?.data || {};
      Object.entries(data).forEach(([k, v]) => {
        const el = form.querySelector(`[name="${k}"]`);
        if (!el) return;
        if (el.type === "checkbox") el.checked = v === "Yes" || v === true;
        else el.value = v;
      });
    } catch {
      // ignore
    }
  }

  function submitReferral(e) {
    e.preventDefault();
    if (!validateStep(5)) return;

    const data = readFormData();
    const body = buildReferralText(data);
    const subject = `Physician Referral — ${data.patientName || "Patient"} — ${data.primaryDx || "Rehabilitation"}`;

    // mailto size limitations vary; keep message concise but structured.
    const href = `mailto:${encodeURIComponent(REFERRAL_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Clear draft after successful intent to submit
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }

    window.location.href = href;
  }

  // Hook buttons
  nextBtn.addEventListener("click", () => {
    if (!validateStep(step)) return;
    setStep(step + 1);
  });

  prevBtn.addEventListener("click", () => setStep(step - 1));
  saveDraftBtn.addEventListener("click", saveDraft);
  form.addEventListener("submit", submitReferral);

  // Allow jumping pills only backwards to avoid skipping required validation
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const target = Number(pill.getAttribute("data-step-pill"));
      if (target < step) setStep(target);
    });
  });

  // Keep preview fresh when editing review step
  form.addEventListener("input", () => {
    if (step === 5) previewEl.textContent = buildReferralText(readFormData());
  });

  loadDraft();
  setStep(1);
});

