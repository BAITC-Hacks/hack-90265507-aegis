import { Outlet } from "react-router-dom";

import Header from "./Header";
import CartConfirmModal from "./CartConfirmModal";

export default function Layout() {
  return (
    <div className="app">
      <Header />

      <main>
        <Outlet />
      </main>

      <CartConfirmModal />
    </div>
  );
}