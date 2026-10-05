import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth";
import { getMotherDestination } from "./mother-routing";
import { MotherHomePage } from "./pages/MotherHomePage";
import { MotherAccountPage } from "./pages/MotherAccountPage";
import { MotherMonitoringPage } from "./pages/MotherMonitoringPage";
import { MotherEducationPage } from "./pages/MotherEducationPage";
import { MotherConsultationPage } from "./pages/MotherConsultationPage";
import { MotherPersonalProfilePage } from "./pages/MotherPersonalProfilePage";
import { MotherFacilityPage } from "./pages/MotherFacilityPage";
import { MotherPregnancyProfilePage } from "./pages/MotherPregnancyProfilePage";
import { MotherAncPage } from "./pages/MotherAncPage";
import { MotherDangerScreeningPage } from "./pages/MotherDangerScreeningPage";
import { MotherP4kPage } from "./pages/MotherP4kPage";

export function MotherEntryDispatcher() {
  const { user } = useAuth();
  const destination = getMotherDestination(user);
  if (destination === "/m") {
    return <Navigate to="/m/home" replace />;
  }
  return <Navigate to={destination} replace />;
}

export function MotherRouter() {
  const { user } = useAuth();

  // Role Guard: Reject non-MOTHER users attempting to access mother routes
  if (user && user.role !== "MOTHER") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Routes>
      <Route index element={<MotherEntryDispatcher />} />
      <Route path="home" element={<MotherHomePage />} />
      <Route path="monitoring" element={<MotherMonitoringPage />} />
      <Route path="anc" element={<MotherAncPage />} />
      <Route path="danger-screening" element={<MotherDangerScreeningPage />} />
      <Route path="p4k" element={<MotherP4kPage />} />
      <Route path="consultation" element={<MotherConsultationPage />} />
      <Route path="education" element={<MotherEducationPage />} />
      <Route path="education/:slug" element={<MotherEducationPage />} />
      <Route path="account" element={<MotherAccountPage />} />

      {/* Onboarding multi-step subroutes */}
      <Route path="onboarding/personal" element={<MotherPersonalProfilePage />} />
      <Route path="onboarding/facility" element={<MotherFacilityPage />} />
      <Route path="onboarding/pregnancy" element={<MotherPregnancyProfilePage />} />

      {/* Fallback to dispatcher */}
      <Route path="*" element={<Navigate to="/m" replace />} />
    </Routes>
  );
}
