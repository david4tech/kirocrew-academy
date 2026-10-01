import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { LoadingGhost } from './components/LoadingGhost';
import { LandingPage } from './pages/LandingPage';

// Code split every screen past the landing page, and the auth-aware shell
// components themselves: RequireAuth and AppLayout both import lib/auth.ts,
// which configures aws-amplify at module load, so keeping them lazy keeps
// Amplify out of the entry chunk for an unauthenticated visitor.
const RequireAuth = lazy(() => import('./components/RequireAuth').then((m) => ({ default: m.RequireAuth })));
const RequireOnboarded = lazy(() =>
  import('./components/RequireOnboarded').then((m) => ({ default: m.RequireOnboarded })),
);
const AppLayout = lazy(() => import('./components/AppLayout').then((m) => ({ default: m.AppLayout })));
const SignInPage = lazy(() => import('./pages/auth/SignInPage').then((m) => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage').then((m) => ({ default: m.SignUpPage })));
const ConfirmSignUpPage = lazy(() =>
  import('./pages/auth/ConfirmSignUpPage').then((m) => ({ default: m.ConfirmSignUpPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const WorldMapPage = lazy(() => import('./pages/WorldMapPage').then((m) => ({ default: m.WorldMapPage })));
const TopicListPage = lazy(() => import('./pages/TopicListPage').then((m) => ({ default: m.TopicListPage })));
const ChallengePlayerPage = lazy(() =>
  import('./pages/ChallengePlayerPage').then((m) => ({ default: m.ChallengePlayerPage })),
);
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const SandboxPage = lazy(() => import('./pages/SandboxPage').then((m) => ({ default: m.SandboxPage })));

export function App() {
  return (
    <Suspense fallback={<LoadingGhost />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/sign-in" element={<SignInPage />} />
        <Route path="/auth/sign-up" element={<SignUpPage />} />
        <Route path="/auth/confirm" element={<ConfirmSignUpPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />

          <Route element={<RequireOnboarded />}>
            <Route element={<AppLayout />}>
              <Route path="/map" element={<WorldMapPage />} />
              <Route path="/world/:worldId" element={<TopicListPage />} />
              <Route path="/world/:worldId/topic/:topicId" element={<ChallengePlayerPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/sandbox" element={<SandboxPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
