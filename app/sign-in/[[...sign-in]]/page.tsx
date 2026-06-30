import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
      <SignIn
        routing="path"
        path="/sign-in"
        appearance={clerkAppearance}
        forceRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
