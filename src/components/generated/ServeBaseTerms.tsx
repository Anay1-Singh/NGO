import { useEffect } from "react";
import type { ReactNode } from "react";
import { Icon } from "./ServeBaseIcons";
import { smoothScrollToElement } from "./ServeBaseSmoothScroll";
import "./ServeBaseTerms.css";

const termsSections: { id: string; title: string; content: ReactNode }[] = [
  {
    id: "prototype",
    title: "An academic demonstration",
    content: (
      <>
        <p>
          ServeBase is a community service project for evaluation at K.R.
          Mangalam University. It demonstrates volunteer, donor, drive, and
          reporting workflows. Use sample information while exploring it.
        </p>
        <p>
          Admin sign-in and volunteer account creation provide demo access only.
          They do not verify identity or provide production authentication. Do
          not use this build as the sole record for a live operation, donation,
          emergency, or safeguarding decision.
        </p>
      </>
    ),
  },
  {
    id: "profiles",
    title: "Profiles and optional photographs",
    content: (
      <>
        <p>
          Provide accurate demonstration details and only information you are
          allowed to share. A profile photograph is optional. Use your own image
          or one you have permission to use; avoid uploading identity documents,
          sensitive images, or photographs of other people without permission.
        </p>
        <p>
          Creating a volunteer profile adds a record to this browser’s shared
          workspace. Demo admin access can view and edit that record. Selecting
          an existing volunteer identity is not an ownership check, and accepting
          these terms does not make the profile private.
        </p>
      </>
    ),
  },
  {
    id: "storage",
    title: "What stays on this device",
    content: (
      <>
        <p>
          Workspace records and saved profile photos are stored in this browser’s
          local storage for this site. Session flags use tab session storage;
          appearance preferences may also be saved locally. There is no
          application server, cloud account, or automatic synchronization between
          browsers or devices in this phase.
        </p>
        <p>
          Anyone with access to this browser profile may be able to open the
          workspace. Signing out ends demo access in the current tab; it does
          not erase stored records, photographs, or downloaded files. Avoid
          entering personal information on a shared or public computer.
        </p>
      </>
    ),
  },
  {
    id: "responsible-use",
    title: "Use the workspace responsibly",
    content: (
      <>
        <p>
          Keep entries respectful and relevant to community service. Do not
          impersonate another person, upload harmful material, or record someone
          else’s contact or contribution details without their permission. Check
          rosters, dates, locations, hours, and contribution amounts before
          relying on them.
        </p>
        <p>
          A drive registration is a planning record, not confirmation of safety,
          eligibility, transport, or supervision. Confirm arrangements directly
          with the event coordinator and follow their instructions. This demo
          does not collect payments or issue official donation receipts.
        </p>
      </>
    ),
  },
  {
    id: "exports-removal",
    title: "Exports, backups, and removal",
    content: (
      <>
        <p>
          CSV exports can contain contact, contribution, and participation
          information. Full JSON backups also include saved profile photographs.
          Check the selected dataset before downloading, keep files in an
          appropriate place, and share them only with people who should have
          access. Restoring a backup replaces the current local workspace.
        </p>
        <p>
          Ask the project coordinator to help edit or remove a record. Clearing
          this site’s browser data removes its locally stored workspace and
          preferences; resetting the demo may recreate sample records. Existing
          downloads and backups remain until you delete those files separately,
          and restoring an older backup can bring removed information back.
        </p>
      </>
    ),
  },
  {
    id: "references",
    title: "Project references and availability",
    content: (
      <>
        <p>
          University credits identify the academic context. References to the UN
          Sustainable Development Goals describe the project’s intended
          alignment; they do not claim endorsement, certification, or a
          partnership with the United Nations. Referenced technologies belong
          to their respective owners.
        </p>
        <p>
          Features may change during development. Browser limits, cleared site
          data, and device failures can affect stored records. Keep a suitable
          backup of any demonstration work you want to retain.
        </p>
      </>
    ),
  },
  {
    id: "questions",
    title: "Questions and later versions",
    content: (
      <>
        <p>
          For questions about these terms, a profile, a drive, or an export,
          contact your project or event coordinator through the channel they
          have provided. The <a href="#/team">project team page</a> lists the
          academic contributors.
        </p>
        <p>
          This version applies to the current browser-local prototype. Review
          the version date if the page changes. Production accounts, shared
          storage, and future integrations will need their own published terms
          before use.
        </p>
      </>
    ),
  },
];

export function TermsPage({ route }: { route: string }) {
  const section = new URLSearchParams(route.split("?")[1] || "").get("section");
  useEffect(() => {
    if (!section || !termsSections.some((item) => item.id === section)) return;
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById(`sb-terms-${section}`);
      heading?.focus({ preventScroll: true });
      smoothScrollToElement(heading, 104);
    });
    return () => cancelAnimationFrame(frame);
  }, [section]);

  return (
    <div className="sx-terms sx-container">
      <header className="sx-terms-intro">
        <span className="sx-label"><i />Using ServeBase</span>
        <h1>Terms &amp; Conditions</h1>
        <p>
          A clear guide to demo access, your profile, and the information stored
          in this workspace.
        </p>
        <div className="sx-terms-version">
          <span>Version 2026-10-26</span>
          <span>Effective <time dateTime="2026-10-26">26 October 2026</time></span>
          <span>Academic software prototype</span>
        </div>
      </header>

      <div className="sx-terms-summary" aria-label="The essentials">
        <Icon name="shield" size={24} />
        <div>
          <h2>Before you create a profile</h2>
          <p>
            Use demonstration details, keep your photo optional, and remember
            that this browser’s admin workspace can access volunteer records.
            Demo sign-in does not protect them with a real account password.
          </p>
        </div>
      </div>

      <div className="sx-terms-layout">
        <nav className="sx-terms-contents" aria-label="Terms contents">
          <span className="sx-label">On this page</span>
          {termsSections.map((item, index) => (
            <a
              key={item.id}
              href={`#/terms?section=${item.id}`}
              aria-current={section === item.id ? "location" : undefined}
              onClick={(event) => {
                if (section !== item.id) return;
                event.preventDefault();
                const heading = document.getElementById(`sb-terms-${item.id}`);
                heading?.focus({ preventScroll: true });
                smoothScrollToElement(heading, 104);
              }}
            >
              <span>0{index + 1}</span>{item.title}
            </a>
          ))}
          <a className="sx-terms-guide" href="#/documentation">
            Read the field guide<Icon name="arrow" size={15} />
          </a>
        </nav>
        <div className="sx-terms-body">
          {termsSections.map((item, index) => (
            <section className="sx-terms-section" key={item.id} aria-labelledby={`sb-terms-${item.id}`}>
              <span className="sx-terms-number" aria-hidden="true">0{index + 1}</span>
              <div>
                <h2 id={`sb-terms-${item.id}`} tabIndex={-1}>{item.title}</h2>
                {item.content}
              </div>
            </section>
          ))}
          <div className="sx-terms-return">
            <span>Ready to continue?</span>
            <a href="#/volunteer/register">Create a volunteer profile<Icon name="arrow" size={17} /></a>
          </div>
        </div>
      </div>
    </div>
  );
}
