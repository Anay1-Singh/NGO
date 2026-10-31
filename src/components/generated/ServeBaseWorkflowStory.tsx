import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./ServeBaseIcons";
import type { IconName } from "./ServeBaseIcons";

const stages = [
  {
    title: "Start with a person.",
    body: "A volunteer offers a few hours on the weekend. Their profile captures the contact details, skills, and availability a coordinator needs.",
    label: "Volunteer profile",
    record: "Aarav Kumar",
    detail: "Community outreach / Weekends",
    icon: "users",
  },
  {
    title: "Give them a place on the roster.",
    body: "The community drive needs a distribution team. An assignment links the volunteer to that drive, with a specific role and a capacity check.",
    label: "Drive assignment",
    record: "Community food drive",
    detail: "Distribution support / Registered",
    icon: "calendar",
  },
  {
    title: "Leave a record of the day.",
    body: "Afterward, mark attendance and service hours. The history stays with the volunteer and the drive, ready for the next review or CSV export.",
    label: "Participation history",
    record: "Attendance recorded",
    detail: "Role, hours, notes / Ready to report",
    icon: "check",
  },
];

type Pose = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  shade: number;
};
const poses: Pose[] = [
  { x: 0, y: 0, rotate: 0, scale: 1, shade: 0 },
  { x: 7, y: 12, rotate: -2.4, scale: 0.978, shade: 0.13 },
  { x: 12, y: 24, rotate: 2.6, scale: 0.952, shade: 0.24 },
];
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const ease = (n: number) => n * n * (3 - 2 * n);
function mix(a: Pose, b: Pose, t: number): Pose {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    rotate: a.rotate + (b.rotate - a.rotate) * t,
    scale: a.scale + (b.scale - a.scale) * t,
    shade: a.shade + (b.shade - a.shade) * t,
  };
}

/** The scroll position scrubs one continuous deck, including when direction reverses. */
export function WorkflowStory() {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useLayoutEffect(() => {
    const section = root.current;
    const deck = section?.querySelector<HTMLElement>(".sx-story-display");
    const sticky = section?.querySelector<HTMLElement>(".sx-story-sticky");
    if (!section || !deck || !sticky) return;
    const articles = Array.from(
      section.querySelectorAll<HTMLElement>("[data-story-step]"),
    );
    const cards = Array.from(
      deck.querySelectorAll<HTMLElement>("[data-story-card]"),
    );
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const compact = matchMedia("(max-width: 700px)");
    let anchors: number[] = [];
    let focusLine = innerHeight * 0.5;
    let width = 0;
    let height = 0;
    let current = 0;
    let target = 0;
    let selected = -1;
    let frame = 0;
    let measuredFrame = 0;
    let previousTime = 0;
    let initialized = false;
    const transforms: string[] = [];
    const shades: string[] = [];

    const paint = (progress: number) => {
      // Hold the cards still around each reading position, then shuffle between them.
      const segment = Math.min(1, Math.floor(progress));
      const fraction = clamp(progress - segment);
      const t = preference.matches
        ? Math.round(fraction)
        : ease(clamp((fraction - 0.22) / 0.56));
      const outgoing = segment;
      const incoming = segment + 1;
      const third = (segment + 2) % cards.length;
      const active = t < 0.5 ? outgoing : incoming;
      const shuffling = t > 0.001 && t < 0.999;
      const progressValue = progress.toFixed(4);
      const shufflingValue = String(shuffling);
      if (deck.dataset.progress !== progressValue)
        deck.dataset.progress = progressValue;
      if (deck.dataset.shuffling !== shufflingValue)
        deck.dataset.shuffling = shufflingValue;

      // At the outside of the arc, the outgoing card changes depth and returns under the deck.
      const lifted: Pose = {
        x: -width * 0.88,
        y: -Math.min(height * 0.13, 42),
        rotate: -9,
        scale: 0.97,
        shade: 0.02,
      };
      const outgoingPose =
        t < 0.5
          ? mix(poses[0], lifted, ease(t * 2))
          : mix(lifted, poses[2], ease((t - 0.5) * 2));
      const incomingPose = mix(poses[1], poses[0], ease(clamp(t / 0.72)));
      const thirdPose = mix(poses[2], poses[1], ease(t));
      const layout = [
        { index: outgoing, pose: outgoingPose, depth: t < 0.5 ? 0 : 2 },
        { index: incoming, pose: incomingPose, depth: t < 0.5 ? 1 : 0 },
        { index: third, pose: thirdPose, depth: t < 0.5 ? 2 : 1 },
      ];
      layout.forEach(({ index, pose, depth }) => {
        const card = cards[index];
        const transform = `translate3d(${pose.x.toFixed(3)}px,${pose.y.toFixed(3)}px,0) rotate(${pose.rotate.toFixed(3)}deg) scale(${pose.scale.toFixed(5)})`;
        const shade = pose.shade.toFixed(3);
        const zIndex = String(3 - depth);
        const depthValue = String(depth);
        if (transforms[index] !== transform) {
          transforms[index] = transform;
          card.style.transform = transform;
        }
        if (card.style.zIndex !== zIndex) card.style.zIndex = zIndex;
        if (shades[index] !== shade) {
          shades[index] = shade;
          card.style.setProperty("--story-shade", shade);
        }
        if (card.dataset.depth !== depthValue) card.dataset.depth = depthValue;
      });
      if (active !== selected) {
        selected = active;
        setStep(active);
      }
    };
    const position = () => {
      const point = scrollY + focusLine;
      if (point <= anchors[0]) return 0;
      if (point >= anchors[2]) return 2;
      const segment = point < anchors[1] ? 0 : 1;
      return (
        segment +
        clamp(
          (point - anchors[segment]) /
            Math.max(1, anchors[segment + 1] - anchors[segment]),
        )
      );
    };
    const tick = (time: number) => {
      frame = 0;
      const elapsed = previousTime ? Math.min(48, time - previousTime) : 16;
      previousTime = time;
      // A short catch-up softens wheel steps without adding momentum to native scrolling.
      current = preference.matches
        ? target
        : current + (target - current) * (1 - Math.exp(-elapsed / 70));
      if (Math.abs(target - current) < 0.0005) current = target;
      paint(current);
      if (current !== target) frame = requestAnimationFrame(tick);
      else previousTime = 0;
    };
    const onScroll = () => {
      if (!anchors.length) return;
      const next = position();
      // Scrolling elsewhere on the page should not keep repainting a settled
      // deck. Geometry is read only when layout actually changes below.
      if (next === target && (frame || current === next)) return;
      target = next;
      if (preference.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        current = target;
        paint(current);
      } else if (!frame) frame = requestAnimationFrame(tick);
    };
    const measure = () => {
      measuredFrame = 0;
      anchors = articles.map((article) => {
        const rect = article.getBoundingClientRect();
        return scrollY + rect.top + rect.height / 2;
      });
      width = cards[0].offsetWidth;
      height = cards[0].offsetHeight;
      if (compact.matches) {
        const top = parseFloat(getComputedStyle(sticky).top) || 16;
        const bottom = top + sticky.offsetHeight;
        focusLine = bottom + Math.max(40, (innerHeight - 84 - bottom) / 2);
      } else focusLine = innerHeight * 0.5;
      section.style.setProperty("--story-focus-line", `${focusLine}px`);
      target = position();
      if (!initialized || preference.matches) {
        initialized = true;
        current = target;
        paint(current);
      } else {
        // A resize can change the shuffle's horizontal travel while progress
        // remains identical. Refresh that pose even when no scroll is needed.
        paint(current);
        onScroll();
      }
    };
    const requestMeasure = () => {
      if (!measuredFrame) measuredFrame = requestAnimationFrame(measure);
    };
    const onPreferenceChange = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      measure();
    };
    measure();
    const observer = new ResizeObserver(requestMeasure);
    observer.observe(section);
    observer.observe(sticky);
    articles.forEach((article) => observer.observe(article));
    // A header/hero/font reflow can move every article without resizing this
    // section. Observe its preceding layout blocks so cached document anchors
    // stay accurate without measuring on every scroll frame.
    let preceding = section.previousElementSibling;
    while (preceding) {
      observer.observe(preceding);
      preceding = preceding.previousElementSibling;
    }
    if (section.parentElement) observer.observe(section.parentElement);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", requestMeasure);
    preference.addEventListener("change", onPreferenceChange);
    compact.addEventListener("change", requestMeasure);
    document.fonts.addEventListener("loadingdone", requestMeasure);
    // Font loading can move the story without changing its own dimensions.
    let disposed = false;
    document.fonts.ready.then(() => {
      if (!disposed) requestMeasure();
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measuredFrame);
      observer.disconnect();
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", requestMeasure);
      preference.removeEventListener("change", onPreferenceChange);
      compact.removeEventListener("change", requestMeasure);
      document.fonts.removeEventListener("loadingdone", requestMeasure);
    };
  }, []);

  return (
    <section
      className="sx-story sx-story-shuffle sx-container"
      id="workflow"
      ref={root}
    >
      <div className="sx-story-sticky">
        <span className="sx-label">
          <i />A record’s journey / Scroll to follow
        </span>
        <div
          className="sx-story-display"
          data-step={step}
          aria-label="A volunteer record in three stages"
        >
          {stages.map((stage, i) => (
            <div
              className="sx-story-sheet sheet-front sx-story-card"
              data-story-card={i}
              key={stage.label}
              aria-hidden={step !== i}
              role="group"
              aria-label={`${stage.label}: ${stage.record}`}
            >
              <div className="sx-story-sheet-head">
                <span className="sx-mark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span>FIELD RECORD / 0{i + 1}</span>
                <Icon name="link" size={16} />
              </div>
              <div className="sx-story-record">
                <span className="sx-story-symbol">
                  <Icon name={stage.icon as IconName} size={42} />
                </span>
                <span className="sx-label">{stage.label}</span>
                <h3>{stage.record}</h3>
                <p>{stage.detail}</p>
                <div className="sx-story-record-line" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="sx-story-track" aria-hidden="true">
                {stages.map((item, n) => (
                  <span className={i >= n ? "is-done" : ""} key={item.label}>
                    <i />
                    {n + 1}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <span className="sx-story-caption">
          A fictional example. The relationships are the point.
        </span>
      </div>
      <div className="sx-story-steps">
        {stages.map((stage, i) => (
          <article
            data-story-step={i}
            key={stage.title}
            className={step === i ? "is-current" : ""}
          >
            <div data-motion-reveal="up" data-motion-delay={0}>
              <span className="sx-step-counter">0{i + 1} / 03</span>
              <h2>{stage.title}</h2>
              <p>{stage.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
