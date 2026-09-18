import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import RoleSelect from "./pages/auth/RoleSelect";
import SignupPetParent from "./pages/auth/SignupPetParent";
import SignupProvider from "./pages/auth/SignupProvider";
import Login from "./pages/auth/Login";
import PetParentHome from "./pages/PetParentHome";
import Account from "./pages/Account";
import FindAProvider from "./pages/FindAProvider";
import ProviderProfile from "./pages/ProviderProfile";
import BookingManagement from "./pages/BookingManagement";
import BookingDetails from "./pages/BookingDetails";
import SubmitReview from "./pages/SubmitReview";
import ClientReviews from "./pages/ClientReviews";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderServices from "./pages/ProviderServices";
import ProviderSettings from "./pages/ProviderSettings";
import PetProfile from "./pages/PetProfile";
function App() {
    return (<Routes>
      <Route path="/signup" element={<PublicOnlyRoute><RoleSelect /></PublicOnlyRoute>}/>
      <Route path="/signup/pet-parent" element={<PublicOnlyRoute><SignupPetParent /></PublicOnlyRoute>}/>
      <Route path="/signup/provider" element={<PublicOnlyRoute><SignupProvider /></PublicOnlyRoute>}/>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>}/>

      <Route path="/" element={<ProtectedRoute role="PET_PARENT">
            <PetParentHome />
          </ProtectedRoute>}/>
      <Route path="/account" element={<ProtectedRoute role="PET_PARENT">
            <Account />
          </ProtectedRoute>}/>
      <Route path="/pets/:petId" element={<ProtectedRoute role="PET_PARENT">
            <PetProfile />
          </ProtectedRoute>}/>
      <Route path="/providers" element={<ProtectedRoute role="PET_PARENT">
            <FindAProvider />
          </ProtectedRoute>}/>
      <Route path="/providers/:providerId" element={<ProtectedRoute role="PET_PARENT">
            <ProviderProfile />
          </ProtectedRoute>}/>
      <Route path="/providers/:providerId/reviews" element={<ProtectedRoute role="PET_PARENT">
            <ClientReviews />
          </ProtectedRoute>}/>
      <Route path="/bookings" element={<ProtectedRoute role="PET_PARENT">
            <BookingManagement />
          </ProtectedRoute>}/>
      <Route path="/bookings/:bookingId" element={<ProtectedRoute role="PET_PARENT">
            <BookingDetails />
          </ProtectedRoute>}/>
      <Route path="/bookings/:bookingId/review" element={<ProtectedRoute role="PET_PARENT">
            <SubmitReview />
          </ProtectedRoute>}/>

      <Route path="/provider/dashboard" element={<ProtectedRoute role="PROVIDER">
            <ProviderDashboard />
          </ProtectedRoute>}/>
      <Route path="/provider/services" element={<ProtectedRoute role="PROVIDER">
            <ProviderServices />
          </ProtectedRoute>}/>
      <Route path="/provider/settings" element={<ProtectedRoute role="PROVIDER">
            <ProviderSettings />
          </ProtectedRoute>}/>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>);
}
export default App;
