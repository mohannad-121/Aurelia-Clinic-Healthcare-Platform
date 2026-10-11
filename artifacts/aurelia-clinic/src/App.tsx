import { type ReactNode, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { LocaleProvider } from '@/lib/i18n';
import { AuthLinkProvider } from '@/lib/auth-link';
import { PublicLayout } from '@/components/site';
import { Home, About, Services, ServiceDetail, Doctors, DoctorProfile, Contact, Faq, Articles, ArticleDetail, Legal } from '@/pages/public';
import { Login, Register, Forgot, ResetPassword } from '@/pages/auth';
import Book from '@/pages/book';
const Portal = lazy(() => import('@/pages/portal').then(m => ({ default: m.Portal })));
const DoctorPortal = lazy(() => import('@/pages/portal').then(m => ({ default: m.DoctorPortal })));
const Dashboard = lazy(() => import('@/pages/dashboard').then(m => ({ default: m.Dashboard })));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15000 } } });

const pub = (C: () => ReactNode) => () => <PublicLayout>{C()}</PublicLayout>;

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={pub(Home)} />
        <Route path="/about" component={pub(About)} />
        <Route path="/services" component={pub(Services)} />
        <Route path="/services/:slug" component={pub(ServiceDetail)} />
        <Route path="/doctors" component={pub(Doctors)} />
        <Route path="/doctors/:id" component={pub(DoctorProfile)} />
        <Route path="/book" component={pub(Book)} />
        <Route path="/contact" component={pub(Contact)} />
        <Route path="/faq" component={pub(Faq)} />
        <Route path="/articles" component={pub(Articles)} />
        <Route path="/articles/:slug" component={pub(ArticleDetail)} />
        <Route path="/privacy" component={pub(() => <Legal kind="privacy" />)} />
        <Route path="/terms" component={pub(() => <Legal kind="terms" />)} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={Forgot} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/portal"><Suspense fallback={<LoadingArea />}><Portal /></Suspense></Route>
        <Route path="/doctor"><Suspense fallback={<LoadingArea />}><DoctorPortal /></Suspense></Route>
        <Route path="/dashboard"><Suspense fallback={<LoadingArea />}><Dashboard /></Suspense></Route>
        <Route path="/dashboard/:module"><Suspense fallback={<LoadingArea />}><Dashboard /></Suspense></Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}
function LoadingArea() {
  return <div className="min-h-[100dvh] grid place-items-center bg-pearl" role="status" aria-live="polite"><span className="text-navy">Loading your workspace…</span></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <AuthLinkProvider>
                <Router />
              </AuthLinkProvider>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </MotionConfig>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export default App;
