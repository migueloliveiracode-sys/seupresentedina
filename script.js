const manuscript = window.MANUSCRIPT;
const escapeHtml = (text) => String(text)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function paginateParagraphs(paragraphs, limit = 780) {
  const groups = [];
  let group = [];
  let size = 0;
  paragraphs.forEach((paragraph) => {
    if (group.length && size + paragraph.length > limit) {
      groups.push(group);
      group = [];
      size = 0;
    }
    group.push(paragraph);
    size += paragraph.length;
  });
  if (group.length) groups.push(group);
  return groups;
}

function buildPages() {
  const pages = [{
    type: "cover",
    label: "Capa",
    sectionIndex: -1,
    html: `<div class="cover-mark">D</div><p class="overline">Para Diana</p><h1>Enquanto ainda <em>não tem nome</em></h1><p class="cover-subtitle">Um livro de ${escapeHtml(manuscript.author)}</p><div class="ornament"></div><p class="cover-date">${escapeHtml(manuscript.date)}</p>`,
  }];

  manuscript.sections.forEach((section, sectionIndex) => {
    const number = section.number === "PRÓLOGO" || section.number === "EPÍLOGO" ? section.number : `Capítulo ${section.number}`;
    pages.push({
      type: "chapter",
      label: section.title,
      sectionIndex,
      html: `<p class="chapter-index">${escapeHtml(number)}</p><h2 class="chapter-title">${escapeHtml(section.title)}</h2><div class="chapter-line"></div>`,
    });
    paginateParagraphs(section.paragraphs).forEach((paragraphs, index) => {
      const isLast = section.number === "EPÍLOGO" && index === paginateParagraphs(section.paragraphs).length - 1;
      pages.push({
        type: "letter",
        label: section.title,
        sectionIndex,
        html: `<div class="letter">${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${isLast ? `<div class="signature">${escapeHtml(manuscript.author)}</div><p class="final-date">${escapeHtml(manuscript.date)}</p>` : ""}</div>`,
      });
    });
  });
  return pages;
}

const book = {
  title: manuscript.title,
  recipient: manuscript.dedication,
  author: manuscript.author,
  pages: buildPages(),
};

const page = document.querySelector("#page");
const pageContent = document.querySelector("#pageContent");
const pageNumber = document.querySelector("#pageNumber");
const pageStatus = document.querySelector("#pageStatus");
const chapterLabel = document.querySelector("#chapterLabel");
const progressFill = document.querySelector("#progressFill");
const previousButton = document.querySelector("#previousButton");
const nextButton = document.querySelector("#nextButton");
const restartButton = document.querySelector("#restartButton");
const chaptersButton = document.querySelector("#chaptersButton");
const closeChaptersButton = document.querySelector("#closeChaptersButton");
const chapterDrawer = document.querySelector("#chapterDrawer");
const chapterBackdrop = document.querySelector("#chapterBackdrop");
const chapterNavigation = document.querySelector("#chapterNavigation");

let current = Math.min(Number(localStorage.getItem("gift-book-page") || 0), book.pages.length - 1);
let turning = false;
let touchStartX = 0;

const chapterPages = book.pages.reduce((map, item, index) => {
  if (item.type === "chapter") map.set(item.sectionIndex, index);
  return map;
}, new Map());

manuscript.sections.forEach((section, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chapter-link";
  button.dataset.section = String(index);
  button.innerHTML = `<strong>${section.number}</strong><span>${escapeHtml(section.title)}</span>`;
  button.addEventListener("click", () => {
    const destination = chapterPages.get(index);
    if (typeof destination === "number") {
      const direction = destination >= current ? 1 : -1;
      current = destination;
      page.classList.add(direction > 0 ? "turn-next" : "turn-previous");
      render();
      window.setTimeout(() => page.classList.remove("turn-next", "turn-previous"), 560);
    }
    closeChapterDrawer();
  });
  chapterNavigation.appendChild(button);
});

function render() {
  const data = book.pages[current];
  pageContent.className = `page-inner ${data.type}`;
  pageContent.innerHTML = data.html;
  pageNumber.textContent = current === 0 ? "" : String(current).padStart(2, "0");
  pageStatus.textContent = current === 0 ? "Capa" : `${current} de ${book.pages.length - 1}`;
  chapterLabel.textContent = data.label;
  progressFill.style.width = `${(current / (book.pages.length - 1)) * 100}%`;
  previousButton.disabled = current === 0;
  nextButton.querySelector("span").textContent = current === 0 ? "Começar" : current === book.pages.length - 1 ? "Voltar à capa" : "Continuar";
  chapterNavigation.querySelectorAll(".chapter-link").forEach((link) => {
    link.classList.toggle("active", Number(link.dataset.section) === data.sectionIndex);
  });
  localStorage.setItem("gift-book-page", current);
}

function changePage(direction) {
  if (turning) return;
  const next = direction > 0 ? (current === book.pages.length - 1 ? 0 : current + 1) : Math.max(0, current - 1);
  if (next === current) return;
  turning = true;
  page.classList.add(direction > 0 ? "turn-next" : "turn-previous");
  window.setTimeout(() => { current = next; render(); }, 270);
  window.setTimeout(() => { page.classList.remove("turn-next", "turn-previous"); turning = false; }, 560);
}

previousButton.addEventListener("click", () => changePage(-1));
nextButton.addEventListener("click", () => changePage(1));
restartButton.addEventListener("click", () => { if (current) { current = 1; changePage(-1); } });
function openChapterDrawer() {
  chapterDrawer.classList.add("open");
  chapterBackdrop.classList.add("open");
  chapterDrawer.setAttribute("aria-hidden", "false");
  chaptersButton.setAttribute("aria-expanded", "true");
  chapterDrawer.querySelector(".chapter-link.active")?.scrollIntoView({ block: "center" });
}
function closeChapterDrawer() {
  chapterDrawer.classList.remove("open");
  chapterBackdrop.classList.remove("open");
  chapterDrawer.setAttribute("aria-hidden", "true");
  chaptersButton.setAttribute("aria-expanded", "false");
}
chaptersButton.addEventListener("click", openChapterDrawer);
closeChaptersButton.addEventListener("click", closeChapterDrawer);
chapterBackdrop.addEventListener("click", closeChapterDrawer);
document.addEventListener("keydown", (event) => {
  if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); changePage(1); }
  if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); changePage(-1); }
});
page.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
page.addEventListener("touchend", (event) => {
  const distance = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(distance) > 48) changePage(distance < 0 ? 1 : -1);
}, { passive: true });

const canvas = document.querySelector("#particles");
const context = canvas.getContext("2d");
let particles = [];
function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  particles = Array.from({ length: Math.min(34, Math.floor(innerWidth / 26)) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, size: Math.random() * 1.4 + .3, speed: Math.random() * .12 + .035, drift: Math.random() * .16 - .08, alpha: Math.random() * .28 + .06 }));
}
function animateParticles() {
  context.clearRect(0, 0, innerWidth, innerHeight);
  particles.forEach((particle) => {
    particle.y -= particle.speed;
    particle.x += particle.drift;
    if (particle.y < -4) { particle.y = innerHeight + 4; particle.x = Math.random() * innerWidth; }
    context.beginPath();
    context.fillStyle = `rgba(215,173,104,${particle.alpha})`;
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  });
  requestAnimationFrame(animateParticles);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) animateParticles();
render();
