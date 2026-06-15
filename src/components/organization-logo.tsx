'use client';

import { cn } from '@/lib/utils';

type OrganizationLogoProps = {
  logo?: string | null;
  icon: string;
  color: string;
  name: string;
  className?: string;
  iconClassName?: string;
};

export function OrganizationLogo({
  logo,
  icon,
  color,
  name,
  className,
  iconClassName,
}: OrganizationLogoProps) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className={cn('object-cover shrink-0', className)}
      />
    );
  }

  return (
    <div
      className={cn('flex items-center justify-center shrink-0', className)}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span className={iconClassName}>{icon}</span>
    </div>
  );
}
