import { EvumiTanStack } from '@evumi/tracker/tanstack';
import { analytics } from './analytics';

export function EvumiAnalytics() {
  return <EvumiTanStack tracker={analytics} />;
}
