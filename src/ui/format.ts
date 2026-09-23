export function money(amount: number): string {
  const rounded = Math.floor(amount);
  return `$${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** Long form, e.g. "1 sa 5 dk", "4 dk 20 sn", "30 sn". */
export function duration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
  if (minutes > 0) return seconds > 0 ? `${minutes} dk ${seconds} sn` : `${minutes} dk`;
  return `${seconds} sn`;
}

/** Countdown, e.g. "1:04:09" or "4:09". */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function timeAgo(at: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return 'az önce';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export function percent(share: number): string {
  return `%${Math.round(share * 100)}`;
}

export function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
