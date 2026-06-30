import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
      <SignUp
        routing="path"
        path="/sign-up"
        appearance={clerkAppearance}
        forceRedirectUrl="/onboarding"
        signInUrl="/sign-in"
      />
    </div>
  );
}
