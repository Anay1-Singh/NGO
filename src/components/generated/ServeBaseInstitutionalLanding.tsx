import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import "./ServeBaseInstitutionalLanding.css";
import "./ServeBaseInteractions.css";
import { AdminAuthPage } from "./ServeBaseAuth";
import { useServeBaseTheme } from "./ServeBaseTheme";
import "./ServeBaseTheme.css";
import { AdminDashboard } from "./ServeBaseDashboard";
import { WorkspaceProvider } from "./ServeBaseStore";
import { ServeBasePublic } from "./ServeBasePublic";
import "./ServeBasePolish.css";
import "./ServeBaseConsole.css";
import { MotionSurface } from "./ServeBaseMotion";
import "./ServeBaseVolunteer.css";
import { useVolunteerTheme } from "./ServeBaseVolunteerTheme";
import { navigateServeBase, useServeBaseRoute } from "./ServeBaseNavigation";
import "./ServeBaseWarmTheme.css";
import "./ServeBaseWarmPublic.css";
import "./ServeBaseWarmConsole.css";
import "./ServeBaseFluid.css";

const loadVolunteer = () => import("./ServeBaseVolunteer");
const VolunteerExperience = lazy(() =>
  loadVolunteer().then((module) => ({ default: module.VolunteerExperience })),
);

const demoSessionKey = "servebase-demo-session";
export const ServeBaseInstitutionalLanding = () => {
  const { theme, toggleTheme } = useServeBaseTheme();
  const { volunteerTheme, toggleVolunteerTheme } = useVolunteerTheme();
  const route = useServeBaseRoute();
  const [demoSession, setDemoSession] = useState(() => {
    try {
      return sessionStorage.getItem(demoSessionKey) === "active";
    } catch {
      return false;
    }
  });
  const cleanRoute = route.replace(/^#/, "").split("?")[0].replace(/\/$/, "");
  const volunteerArea =
    cleanRoute === "/volunteer" || cleanRoute.startsWith("/volunteer/");
  const auth =
    cleanRoute === "/admin/login" || cleanRoute === "/admin/reset-password";
  const dashboard = cleanRoute.startsWith("/admin/") && !auth;
  useEffect(() => {
    // Warm the small volunteer chunk after first paint and on navigation intent.
    let warmed = false;
    const preload = () => {
      if (warmed) return;
      warmed = true;
      void loadVolunteer().catch(() => { warmed = false; });
    };
    const onIntent = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('a[href^="#/volunteer"]')) preload();
    };
    const idle = "requestIdleCallback" in window
      ? window.requestIdleCallback(preload, { timeout: 1200 })
      : undefined;
    const timer = idle === undefined ? setTimeout(preload, 400) : undefined;
    document.addEventListener("pointerover", onIntent, { passive: true });
    document.addEventListener("focusin", onIntent);
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      clearTimeout(timer);
      document.removeEventListener("pointerover", onIntent);
      document.removeEventListener("focusin", onIntent);
    };
  }, []);
  useLayoutEffect(() => {
    if (dashboard && !demoSession) window.location.hash = "/admin/login";
  }, [dashboard, demoSession]);
  useEffect(() => {
    const surface = volunteerArea ? volunteerTheme : theme;
    const volunteerBackground =
      volunteerTheme === "dark" ? "#211D1A" : "#F6F1E7";
    document.documentElement.dataset.servebaseTheme = surface;
    document.documentElement.dataset.servebaseArea = volunteerArea
      ? "volunteer"
      : "main";
    document.documentElement.style.colorScheme = surface;
    document.body.style.background = volunteerArea ? volunteerBackground : "";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        volunteerArea
          ? volunteerBackground
          : theme === "dark"
            ? "#1D1018"
            : "#F8FAFC",
      );
  }, [volunteerArea, volunteerTheme, theme]);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [auth, dashboard, route.split("?")[0]]);
  function enterDemo() {
    try {
      sessionStorage.setItem(demoSessionKey, "active");
    } catch {}
    setDemoSession(true);
    window.location.hash = "/admin/overview";
  }
  function exitDemo() {
    try {
      sessionStorage.removeItem(demoSessionKey);
    } catch {}
    navigateServeBase("/admin/login", () => setDemoSession(false));
  }
  return (
    <WorkspaceProvider>
      <div
        className="sb-app"
        data-route-motion="true"
        data-area={volunteerArea ? "volunteer" : "main"}
        data-theme={volunteerArea ? volunteerTheme : theme}
      >
        <MotionSurface sceneKey={route}>
          {volunteerArea ? (
            <Suspense
              fallback={
                <div className="vp vp-loading" data-theme={volunteerTheme}>
                  <p>Opening your fieldbook…</p>
                </div>
              }
            >
              <VolunteerExperience
                route={route}
                theme={volunteerTheme}
                toggleTheme={toggleVolunteerTheme}
              />
            </Suspense>
          ) : dashboard && demoSession ? (
            <AdminDashboard
              route={route}
              theme={theme}
              toggleTheme={toggleTheme}
              onLogout={exitDemo}
            />
          ) : auth || dashboard ? (
            <AdminAuthPage
              key={route}
              theme={theme}
              toggleTheme={toggleTheme}
              recovery={cleanRoute === "/admin/reset-password"}
              onDemoLogin={enterDemo}
            />
          ) : (
            <ServeBasePublic
              route={route}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          )}
        </MotionSurface>
      </div>
    </WorkspaceProvider>
  );
};
