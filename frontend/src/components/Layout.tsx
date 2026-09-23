import {
  useState,
} from "react";

import {
  X,
} from "lucide-react";

import {
  Outlet,
} from "react-router-dom";

import AssistantPanel from "./AssistantPanel";
import CartConfirmModal from "./CartConfirmModal";
import Header from "./Header";

export default function Layout() {
  const [
    assistantOpen,
    setAssistantOpen,
  ] = useState(false);

  return (
    <div className="app">
      <Header
        onAssistantOpen={() =>
          setAssistantOpen(true)
        }
      />

      <main>
        <Outlet />
      </main>

      <CartConfirmModal />

      {assistantOpen && (
        <>
          <button
            type="button"
            className="assistant-drawer-backdrop"
            aria-label="Закрыть EKTiQ"
            onClick={() =>
              setAssistantOpen(
                false
              )
            }
          />

          <aside className="assistant-drawer">
            <button
              type="button"
              className="assistant-drawer-close"
              aria-label="Закрыть EKTiQ"
              onClick={() =>
                setAssistantOpen(
                  false
                )
              }
            >
              <X size={20} />
            </button>

            <AssistantPanel />
          </aside>
        </>
      )}
    </div>
  );
}