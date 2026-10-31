import { redirect } from 'next/navigation';

/**
 * Dedicated E2E testing harness entrypoint.
 * Redirects directly to the studio with the test harness architecture loaded,
 * keeping the standard `/studio` and `/` clean and empty by default.
 */
export default function StudioHarnessPage(): never {
  redirect('/studio?harness=1');
}
