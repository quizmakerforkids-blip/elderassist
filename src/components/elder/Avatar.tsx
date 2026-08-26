import { cls, initials } from '../../utils/format';

const HUES = [172, 205, 262, 12, 34, 152, 220, 330];

function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return HUES[Math.abs(hash) % HUES.length];
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const hue = hueFor(name);
  return (
    <span
      className={cls('avatar', `avatar--${size}`)}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 42% 46%), hsl(${hue} 48% 34%))`,
      }}
      role="img"
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
