(() => {
  "use strict";

  const GITHUB_USER = "kudanilllo";

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Tema terang / gelap ---------- */
  function initTheme() {
    const button = $("#theme-toggle");
    if (!button) return;

    const sync = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      button.setAttribute("aria-pressed", String(isDark));
    };

    button.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* penyimpanan tidak tersedia, abaikan */
      }
      sync();
    });

    sync();
  }

  /* ---------- 2. Efek mengetik di nama ---------- */
  function initTyping() {
    const el = $("#typed");
    const hero = $(".hero");
    const done = () => hero && hero.classList.add("is-ready");
    if (!el) return done();

    const text = el.dataset.text || "";
    if (reduceMotion) {
      el.textContent = text;
      el.classList.add("is-done");
      return done();
    }

    let i = 0;
    const tick = () => {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        setTimeout(tick, 70 + Math.random() * 60);
      } else {
        setTimeout(done, 250);
        setTimeout(() => el.classList.add("is-done"), 1200);
      }
    };
    setTimeout(tick, 400);
  }

  /* ---------- 3. Animasi muncul saat scroll ---------- */
  function initReveal() {
    const items = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((item) => observer.observe(item));
  }

  /* ---------- 4. Navbar: menu HP & penanda section aktif ---------- */
  function initNav() {
    const toggle = $(".nav__toggle");
    const menu = $("#menu");
    if (!toggle || !menu) return;

    const setMenu = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
      menu.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav__inner")) setMenu(false);
    });

    // tandai link sesuai section yang sedang tampil
    if (!("IntersectionObserver" in window)) return;
    const links = $$("a", menu);
    const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.removeAttribute("aria-current"));
          const active = byId.get(entry.target.id);
          if (active) active.setAttribute("aria-current", "true");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    [...byId.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .forEach((section) => observer.observe(section));
  }

  /* ---------- 5. Grafik kontribusi GitHub ---------- */
  async function initGithub() {
    const grid = $("#gh-grid");
    const months = $("#gh-months");
    const total = $("#gh-total");
    const status = $("#gh-status");
    const scroller = $("#gh-scroll");
    if (!grid || !months || !total || !status || !scroller) return;

    const profileUrl = `https://github.com/${GITHUB_USER}`;
    const monthName = new Intl.DateTimeFormat("id-ID", { month: "short" });
    const fullDate = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    try {
      const res = await fetch(
        `https://github-contributions-api.jogruber.de/v4/${GITHUB_USER}?y=last`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const days = Array.isArray(data.contributions) ? data.contributions : [];
      if (!days.length) throw new Error("Data kosong");

      const gridFrag = document.createDocumentFragment();
      const monthFrag = document.createDocumentFragment();

      // kolom pertama dimulai hari Minggu seperti di GitHub
      const pad = new Date(`${days[0].date}T00:00:00`).getDay();
      for (let i = 0; i < pad; i += 1) {
        const spacer = document.createElement("span");
        spacer.className = "gh__cell gh__cell--empty";
        gridFrag.appendChild(spacer);
      }

      let sum = 0;
      let lastMonth = -1;
      let lastLabelWeek = -10;

      days.forEach((day, index) => {
        const date = new Date(`${day.date}T00:00:00`);
        const week = Math.floor((pad + index) / 7);
        sum += day.count;

        const cell = document.createElement("span");
        cell.className = "gh__cell";
        cell.dataset.level = String(day.level);
        cell.title = `${day.count} kontribusi pada ${fullDate.format(date)}`;
        gridFrag.appendChild(cell);

        if ((pad + index) % 7 === 0) {
          const month = date.getMonth();
          if (month !== lastMonth && week - lastLabelWeek >= 3) {
            const label = document.createElement("span");
            label.textContent = monthName.format(date);
            label.style.gridColumn = String(week + 1);
            monthFrag.appendChild(label);
            lastLabelWeek = week;
          }
          lastMonth = month;
        }
      });

      grid.replaceChildren(gridFrag);
      months.replaceChildren(monthFrag);
      grid.setAttribute("role", "img");
      grid.setAttribute(
        "aria-label",
        `Grafik kontribusi GitHub: ${sum} kontribusi dalam setahun terakhir`
      );
      total.textContent = `${sum} kontribusi dalam setahun terakhir`;
      status.textContent = "";

      // tampilkan minggu terbaru di sisi kanan
      scroller.scrollLeft = scroller.scrollWidth;
    } catch (error) {
      total.textContent = "Aktivitas GitHub";
      status.innerHTML = `Grafik belum bisa dimuat. Lihat langsung di <a href="${profileUrl}" target="_blank" rel="noopener">profil GitHub</a>.`;
    }
  }

  /* ---------- 6. Hal kecil ---------- */
  function initFooter() {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  initTheme();
  initTyping();
  initReveal();
  initNav();
  initGithub();
  initFooter();
})();