import { Card, CardHeader, LoaderLine } from '@redplanethq/ui';
import { PlusIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';

import { getIcon } from 'common/icon-picker';

import { useApplication } from 'hooks/application';
import { useLists } from 'hooks/list';

import { useCreateListMutation } from 'services/lists';

import { TabViewType } from 'store/application';

export const ListView = observer(() => {
  const lists = useLists();
  const { changeActiveTab } = useApplication();
  const { mutate: createList, isLoading } = useCreateListMutation({});

  return (
    <div className="flex gap-1 px-4 mt-10 justify-center flex-wrap">
      <div className="flex gap-2 max-w-[97ch] w-full flex-wrap justify-center">
        {lists.map((list, index) => (
          <Card
            key={index}
            className="w-[200px] hover:shadow"
            onClick={() => {
              changeActiveTab(TabViewType.LIST, { entityId: list.id });
            }}
          >
            <CardHeader>
              <div>{getIcon(list?.icon, 24)}</div>
              <div className="text-md">{list.name}</div>
            </CardHeader>
          </Card>
        ))}

        <Card
          className="w-[200px] hover:shadow text-muted-foreground"
          onClick={() => {
            createList(false, {
              onSuccess: (data) =>
                changeActiveTab(TabViewType.LIST, { entityId: data.id }),
            });
          }}
        >
          <CardHeader>
            <div>
              {isLoading ? (
                <LoaderLine size={18} className="animate-spin" />
              ) : (
                <PlusIcon size={18} />
              )}
            </div>
            <div className="text-md">Create list</div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
});
