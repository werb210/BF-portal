import { APPLICATION_TABS } from '../constants/applicationTabs';

export function enforceTabOrder(tabs: string[]) {
  if (JSON.stringify(tabs) !== JSON.stringify(APPLICATION_TABS)) {
    throw new Error('SYSTEM CONTRACT VIOLATION: UI tab mismatch');
  }
}
