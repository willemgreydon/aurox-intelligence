import type { Locale } from '@repo/api-contracts';
import { getMessages, type AppMessages } from '../../lib/i18n/messages';
import { formatOptionalDateTimeLabel, formatRelativeTimeLabel } from '../../lib/formatters';

export type RouteStatus = 'nominal' | 'attention' | 'degraded';
export type RouteStatusTone = 'success' | 'warning' | 'danger' | 'info';

export function mapRouteStatusTone(status: RouteStatus): RouteStatusTone {
  if (status === 'nominal') {
    return 'success';
  }

  if (status === 'attention') {
    return 'warning';
  }

  return 'danger';
}

export function mapRouteStatusLabel(
  status: RouteStatus,
  labels: AppMessages['status'] = getMessages('en').status,
): string {
  if (status === 'nominal') {
    return labels.nominal;
  }

  if (status === 'attention') {
    return labels.attention;
  }

  return labels.degraded;
}

export function mapOptionalTimestamp(
  value: string | null,
  locale: Locale = 'en',
  messages: Pick<AppMessages, 'common'> = getMessages('en'),
) {
  return {
    absolute: formatOptionalDateTimeLabel(value, locale, messages.common.unavailable),
    relative: formatRelativeTimeLabel(value, locale, messages.common.unavailable),
  };
}
