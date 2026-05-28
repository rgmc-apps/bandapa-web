import { Suspense } from "react";
import AuthConfirmContent from "./AuthConfirmContent";

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-white via-surface-low to-chlorophyll/10 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-chlorophyll-dark border-t-transparent animate-spin" />
      </div>
    }>
      <AuthConfirmContent />
    </Suspense>
  );
}
