import { Input } from '@redplanethq/ui';

import { AllProviders } from 'common/wrappers/all-providers';

export const DashboardWrapper = () => {
  return (
    <div className="h-[100vh] w-[100vh]">
      <Input />
    </div>
  );
};

DashboardWrapper.getLayout = function getLayout(page: React.ReactElement) {
  return <AllProviders>{page}</AllProviders>;
};
