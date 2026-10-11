import { useEffect } from 'react';
import { useGetClinic } from '@workspace/api-client-react';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let m = document.querySelector(`meta[${attr}="${key}"]`);
  if (!m) {
    m = document.createElement('meta');
    m.setAttribute(attr, key);
    document.head.appendChild(m);
  }
  m.setAttribute('content', content);
}

export function useSeo(title: string, description: string, image?: string) {
  const { data } = useGetClinic();
  const site = data?.settings.name || 'Aurelia Clinic';
  useEffect(() => {
    const full = `${title} | ${site}`;
    document.title = full;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', site);
    setMeta('property', 'og:url', window.location.origin + window.location.pathname);
    setMeta('property', 'og:locale', document.documentElement.lang === 'ar' ? 'ar_JO' : 'en_US');
    if (image) setMeta('property', 'og:image', image.startsWith('http') ? image : window.location.origin + image);
  }, [title, description, image, site]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [title]);
}
