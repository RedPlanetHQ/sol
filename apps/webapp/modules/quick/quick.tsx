import { AllProviders } from 'common/wrappers/all-providers';

import { useGetIntegrationDefinitions } from 'services/integration-definition';

import { QuickEditor } from './quick-editor';

export const Quick = () => {
  const { isLoading } = useGetIntegrationDefinitions();

  return (
    <div className="flex flex-col justify-start w-full h-full">
      {!isLoading && <QuickEditor />}
    </div>
  );
};

Quick.getLayout = function getLayout(page: React.ReactElement) {
  return <AllProviders>{page}</AllProviders>;
};
