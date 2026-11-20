import { ServeBaseInstitutionalLanding } from "./components/generated/ServeBaseInstitutionalLanding";
import { firebaseConfigStatus } from "./lib/firebase";

export default function App() {
  return (
    <>
      {!firebaseConfigStatus.configured && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: "0 0 auto",
            zIndex: 10000,
            padding: "10px 16px",
            background: "#5a3215",
            color: "#fff7ed",
            font: "600 13px/1.4 system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          Firebase setup is incomplete. Shared authentication and database operations are disabled until .env.local is configured.
        </div>
      )}
      <ServeBaseInstitutionalLanding />
    </>
  );
}
