import { AllProviders } from 'common/wrappers/all-providers';

import { QuickEditor } from './quick-editor';

export const Quick = () => {
  return (
    <div className="flex flex-col justify-start w-full h-full">
      <QuickEditor />
    </div>
  );
};

Quick.getLayout = function getLayout(page: React.ReactElement) {
  return <AllProviders>{page}</AllProviders>;
};
