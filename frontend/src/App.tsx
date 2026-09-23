import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";

import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import ComparePage from "./pages/ComparePage";
import FavoritesPage from "./pages/FavoritesPage";
import CartPage from "./pages/CartPage";
import SpecificationPage from "./pages/SpecificationPage";
import IdentifyPage from "./pages/IdentifyPage";
import ProfilePage from "./pages/ProfilePage";

import InfoPage from "./pages/InfoPage";
import CheckoutPage from "./pages/CheckoutPage";
import AnaloguePage from "./pages/AnaloguePage";
import "./tasks.css";
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/help/:topic" element={<InfoPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/analogue" element={<AnaloguePage />} />

        <Route path="/catalog" element={<CatalogPage />} />

        <Route
          path="/product/:id"
          element={<ProductPage />}
        />

        <Route path="/compare" element={<ComparePage />} />

        <Route
          path="/favorites"
          element={<FavoritesPage />}
        />

        <Route path="/cart" element={<CartPage />} />

        <Route
          path="/specification"
          element={<SpecificationPage />}
        />

        <Route
          path="/identify"
          element={<IdentifyPage />}
        />

        <Route path="/profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
