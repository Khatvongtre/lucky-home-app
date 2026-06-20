import React from 'react';
import { User } from 'lucide-react';

const getInitials = (user) => {
  const source = String(user?.fullName || user?.username || '').trim();
  if (!source) return '';

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
};

const UserAvatar = ({
  user,
  src,
  alt,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
  iconClassName = '',
}) => {
  const avatarSrc = src || user?.avatarUrl || '';
  const initials = getInitials(user);
  const label = alt || user?.fullName || user?.username || 'Avatar người dùng';

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={label}
        className={`object-cover ${className} ${imageClassName}`.trim()}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-blue-600 text-white ${className} ${fallbackClassName}`.trim()}
      aria-label={label}
    >
      {initials
        ? <span className="font-black uppercase">{initials}</span>
        : <User className={iconClassName || 'h-5 w-5'} />}
    </div>
  );
};

export default UserAvatar;
