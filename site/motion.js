// nova.altaystudio.com: small, dependency-free behaviour. Every piece fails quietly:
// without JS the page is complete, and without the GitHub API it keeps its static text.
(() => {
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nav: glass once the page scrolls; burger menu on small screens.
  const nav = document.querySelector("[data-nav]");
  const burger = document.querySelector("[data-burger]");
  const onScroll = () => nav && nav.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  burger?.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  document.querySelectorAll("[data-menu] a").forEach((a) =>
    a.addEventListener("click", () => {
      nav?.classList.remove("is-open");
      burger?.setAttribute("aria-expanded", "false");
    }),
  );

  // Reveal sections as they arrive.
  const items = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    items.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`;
      io.observe(el);
    });
  }

  // Hero: the desk lies back and stands up as you scroll into it.
  const stage = document.querySelector("[data-tilt]");
  const frame = stage?.querySelector(".frame-hero");
  if (stage && frame && !reduce) {
    let ticking = false;
    const update = () => {
      ticking = false;
      if (window.innerWidth <= 720) {
        frame.style.removeProperty("--tilt");
        frame.style.removeProperty("--tilt-scale");
        return;
      }
      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.9)));
      const k = 1 - Math.pow(1 - p, 2);
      frame.style.setProperty("--tilt", `${(16 * (1 - k)).toFixed(2)}deg`);
      frame.style.setProperty("--tilt-scale", (0.96 + 0.04 * k).toFixed(4));
    };
    const queue = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
  }

  // Lightbox for screenshots.
  const dialog = document.getElementById("lightbox");
  const dImg = dialog?.querySelector("img");
  const dCap = dialog?.querySelector(".lightbox-cap");
  document.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!dialog || !dImg || !dCap || typeof dialog.showModal !== "function") return;
      dImg.src = btn.getAttribute("data-open") || "";
      dImg.alt = btn.getAttribute("data-label") || "";
      dCap.textContent = btn.getAttribute("data-label") || "";
      dialog.showModal();
    });
  });
  dialog?.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Copy the commands (without the comments and prompts).
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const src = document.getElementById(btn.getAttribute("data-copy") || "");
      if (!src) return;
      const text = src.innerText
        .split("\n")
        .filter((l) => l.trim().startsWith("$"))
        .map((l) => l.replace(/^\s*\$\s?/, ""))
        .join("\n");
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
        btn.classList.add("is-done");
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.classList.remove("is-done");
        }, 1800);
      } catch {
        btn.textContent = "Select and copy";
      }
    });
  });

  // GitHub: the star count and the latest release, cached for the session.
  const cached = async (key, url) => {
    try {
      const hit = sessionStorage.getItem(key);
      if (hit) return JSON.parse(hit);
    } catch { /* storage refused */ }
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { /* storage refused */ }
    return data;
  };
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
  cached("nova.repo", "https://api.github.com/repos/aaltaay/Nova")
    .then((repo) => {
      // A count is social proof only once it means something; until then the button says GitHub.
      if (typeof repo?.stargazers_count !== "number" || repo.stargazers_count < 25) return;
      document.querySelectorAll("[data-stars]").forEach((el) => {
        el.textContent = `★ ${fmt(repo.stargazers_count)}`;
        el.hidden = false;
      });
    })
    .catch(() => {});
  cached("nova.release", "https://api.github.com/repos/aaltaay/Nova/releases/latest")
    .then((rel) => {
      const tag = rel?.tag_name;
      const link = document.querySelector("[data-release]");
      const text = document.querySelector("[data-release-text]");
      if (!tag || !link || !text) return;
      const when = rel.published_at ? new Date(rel.published_at) : null;
      const ago = when ? Math.max(0, Math.round((Date.now() - when.getTime()) / 86400000)) : null;
      const age = ago === null ? "" : ago === 0 ? " · today" : ago === 1 ? " · yesterday" : ` · ${ago} days ago`;
      text.textContent = `Latest release ${tag}${age}`;
      if (rel.html_url) link.href = rel.html_url;
    })
    .catch(() => {});
})();
