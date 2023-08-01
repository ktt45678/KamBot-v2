import { Duration } from 'luxon';

export function humanizeTime(ms: number) {
  const duration = Duration.fromMillis(ms);
  if (ms < 3600000)
    return duration.toFormat('mm:ss');
  return duration.toFormat('hh:mm:ss');
}