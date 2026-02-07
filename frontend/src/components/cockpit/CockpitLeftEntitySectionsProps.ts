import type { ComponentProps } from 'react';

import CockpitSearchSection from './left/CockpitSearchSection';
import CockpitIdentitySection from './left/CockpitIdentitySection';
import CockpitContactSection from './left/CockpitContactSection';

export type CockpitLeftEntitySectionsProps = {
  search: ComponentProps<typeof CockpitSearchSection>;
  identity: ComponentProps<typeof CockpitIdentitySection>;
  contact: ComponentProps<typeof CockpitContactSection>;
};
