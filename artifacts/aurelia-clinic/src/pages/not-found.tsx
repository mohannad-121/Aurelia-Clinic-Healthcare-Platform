import { Link } from 'wouter';
import { SearchX } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

export default function NotFound() {
  const { locale, t } = useLocale();
  return (
    <main className="min-h-[100dvh] grid place-items-center bg-pearl px-5">
      <section className="card p-10 max-w-md text-center">
        <SearchX className="mx-auto mb-5 h-12 w-12 text-royal" />
        <p className="eyebrow">404</p>
        <h1 className="display text-3xl mt-3">{locale === 'ar' ? 'الصفحة غير موجودة' : 'Page not found'}</h1>
        <p className="text-muted-foreground mt-4">{locale === 'ar' ? 'الرابط غير صالح أو لم تعد هذه الصفحة متاحة.' : 'This link is invalid or the page is no longer available.'}</p>
        <Link href="/" className="btn btn-primary mt-7">{t('nav.home')}</Link>
      </section>
    </main>
  );
}
