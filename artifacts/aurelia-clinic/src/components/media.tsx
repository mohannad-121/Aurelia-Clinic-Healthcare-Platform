import { tr } from '@/lib/i18n';
import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { useUploadMedia } from '@workspace/api-client-react';
import { toast } from '@/hooks/use-toast';
import { errMsg } from '@/lib/i18n';

const MAX = 3_000_000;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function ImageUpload({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const up = useUploadMedia();
  const ref = useRef<HTMLInputElement>(null);
  const pick = (file?: File) => {
    if (!file) return;
    const content_type = TYPES.find(type => type === file.type);
    if (!content_type) return void toast({ title: tr("Use a JPEG, PNG or WebP image."), variant: 'destructive' });
    if (file.size > MAX) return void toast({ title: tr("Images must be 3 MB or smaller."), variant: 'destructive' });
    const r = new FileReader();
    r.onload = () => {
      const base64 = String(r.result).split(',')[1] ?? '';
      up.mutate({ data: { filename: file.name, content_type, base64 } }, {
        onSuccess: (res) => { onChange(res.url); toast({ title: tr("Image uploaded") }); },
        onError: (e) => toast({ title: errMsg(e), variant: 'destructive' }),
      });
    };
    r.onerror = () => toast({ title: tr("The selected file could not be read. Please choose it again."), variant: 'destructive' });
    r.readAsDataURL(file);
  };
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex gap-2">
        <input className="field" inputMode="url" placeholder={tr("https://")} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="btn btn-ghost btn-sm shrink-0" disabled={up.isPending} onClick={() => ref.current?.click()} data-testid="button-upload"><Upload size={15} />{up.isPending ? tr("Uploading") : tr("Upload")}</button>
        <input ref={ref} type="file" accept={TYPES.join(',')} className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {value && <img src={value} alt="" className="mt-2 h-20 rounded-xl object-cover" />}
    </div>
  );
}
