import { OnboardingProvider } from "./onboarding-context";
import { StepIndicator } from "./step-indicator";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div 
      className="h-screen text-slate-900 font-sans overflow-hidden flex items-center justify-center"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <OnboardingProvider>
        <div className="max-w-md w-full h-full flex flex-col relative overflow-hidden bg-white/95 backdrop-blur-sm shadow-2xl sm:rounded-3xl sm:h-[90vh] sm:max-h-[800px]">

          <div className="relative z-10 flex-shrink-0">
            <StepIndicator />
          </div>
          <main className="flex-1 flex flex-col relative z-10 overflow-hidden">{children}</main>
        </div>
      </OnboardingProvider>
    </div>
  );
}
