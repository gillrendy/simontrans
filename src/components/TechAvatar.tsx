import { useState } from 'react';
import { AvatarKey, getAvatarSrc } from '../utils/avatars';

interface TechAvatarProps {
  name: string;
  avatarKey: AvatarKey;
  avatarDataUrl?: string | null;
  sizeClass?: string;
}

export function TechAvatar({
  name,
  avatarKey,
  avatarDataUrl,
  sizeClass = 'w-10 h-10',
}: TechAvatarProps) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .split(' ')
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (failed && !avatarDataUrl) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold shrink-0 border border-slate-300 dark:border-slate-700`}
        aria-label={name}
      >
        {initials || 'TX'}
      </div>
    );
  }

  return (
    <img
      src={avatarDataUrl || getAvatarSrc(avatarKey)}
      alt={`Foto profil ${name}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800`}
    />
  );
}
