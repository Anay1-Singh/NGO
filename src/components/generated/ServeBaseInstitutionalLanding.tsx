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
import { firebaseConfigStatus } from "../../lib/firebase";
import { getMember, signOutCurrentUser, subscribeToAuth } from "../../lib/firebaseAuth";
import type { User } from "firebase/auth";
import "./ServeBaseWarmTheme.css";
import "./ServeBaseWarmPublic.css";
import "./ServeBaseWarmConsole.css";
import "./ServeBaseFluid.css";

const loadVolunteer = () => import("./ServeBaseVolunteer");
const VolunteerExperience = lazy(() =>
  loadVolunteer().then((module) => ({ default: module.VolunteerExperience })),
);

export const ServeBaseInstitutionalLanding = () => {
  const { theme, toggleTheme } = useServeBaseTheme();
  const { volunteerTheme, toggleVolunteerTheme } = useVolunteerTheme();
  const route = useServeBaseRoute();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [member, setMember] = useState<Awaited<ReturnType<typeof getMember>>>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [demoAdmin, setDemoAdmin] = useState(() => {
    try {
      return sessionStorage.getItem("servebase-demo-admin") === "true";
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
  const adminSession = Boolean(
    (authUser &&
      member?.status === "active" &&
      (member.role === "admin" || member.role === "coordinator")) ||
      (!firebaseConfigStatus.configured && demoAdmin) ||
      demoAdmin,
  );
  useEffect(() => {
    if (!firebaseConfigStatus.configured) {
      setAuthLoading(false);
      return;
    }
    return subscribeToAuth(async (user) => {
      setAuthUser(user);
      if (!user) {
        setMember(null);
        setAuthLoading(false);
        return;
      }
      try {
        setMember(await getMember(user.uid));
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);
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
    if (dashboard && !authLoading && !adminSession) window.location.hash = "/admin/login";
  }, [dashboard, authLoading, adminSession]);
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
  function enterAuthenticatedWorkspace() {
    try {
      sessionStorage.setItem("servebase-demo-admin", "true");
    } catch {
      /* best effort */
    }
    setDemoAdmin(true);
    window.location.hash = "/admin/overview";
  }
  async function exitAuthenticatedWorkspace() {
    try {
      sessionStorage.removeItem("servebase-demo-admin");
    } catch {
      /* best effort */
    }
    setDemoAdmin(false);
    if (firebaseConfigStatus.configured) await signOutCurrentUser();
    navigateServeBase("/admin/login", () => {
      setAuthUser(null);
      setMember(null);
    });
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
          ) : dashboard && authLoading ? (
            <div className="sb-app-loading" role="status">Checking your organization access…</div>
          ) : dashboard && adminSession ? (
            <AdminDashboard
              route={route}
              theme={theme}
              toggleTheme={toggleTheme}
              onLogout={exitAuthenticatedWorkspace}
            />
          ) : auth || dashboard ? (
            <AdminAuthPage
              key={route}
              theme={theme}
              toggleTheme={toggleTheme}
              recovery={cleanRoute === "/admin/reset-password"}
              onAuthenticated={enterAuthenticatedWorkspace}
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
