import { assertEquals } from '#test/assert';

import { CAN_RUN_NETWORK_INTEGRATION, getContext, postApi, readString, integrationTest } from './helpers.ts';

integrationTest({
  name: 'admin routes reach service layer and return domain errors on unknown targets',
  ignore: !CAN_RUN_NETWORK_INTEGRATION,
  fn: async () => {
    const context = await getContext();

    const missingUser = await postApi('admin.users', context.adminToken, {
      action: 'set_role',
      user_id: crypto.randomUUID(),
      role: 'tcs'
    });
    assertEquals(missingUser.status, 404);
    assertEquals(readString(missingUser.payload, 'code'), 'USER_NOT_FOUND');

    const missingAgency = await postApi('admin.agencies', context.adminToken, {
      action: 'hard_delete',
      agency_id: crypto.randomUUID()
    });
    assertEquals(missingAgency.status, 404);
    assertEquals(readString(missingAgency.payload, 'code'), 'AGENCY_NOT_FOUND');
  }
});
