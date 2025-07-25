import axios from 'axios';

import {
  CreateListParams,
  DeleteListParams,
  GetListsParams,
  ListParams,
  UpdateListParams,
  UpdatePartialListDescriptionParams,
} from '../types/list.js';

/**
 * Create a new list
 * @param params List creation parameters
 * @returns The created list
 */
export async function createList(params: CreateListParams) {
  const response = await axios.post(`/api/v1/lists`, {
    title: params.title,
  });
  return response.data;
}

export async function getList(params: ListParams) {
  const response = await axios.get(`/api/v1/lists/${params.listId}`);
  return response.data;
}

export async function updateList(params: UpdateListParams) {
  const response = await axios.post(`/api/v1/lists/${params.listId}`, {
    htmlDescription: params.htmlDescription,
  });
  return response.data;
}

export async function updateListPartial(
  params: UpdatePartialListDescriptionParams,
) {
  const { listId, ...data } = params;
  const response = await axios.get(`/api/v1/lists/${listId}`);
  const list = response.data;

  const pageData = {
    htmlContent: data.pageDescription,
    ...data,
  };

  const pageResponse = await axios.post(
    `/api/v1/pages/${list.pageId}/partial`,
    pageData,
  );
  list.pageDescription = pageResponse.data;
  return list;
}

export async function deleteList(params: DeleteListParams) {
  const response = await axios.delete(`/api/v1/lists/${params.listId}`);
  return response.data;
}

/**
 * Get paginated lists
 * @param params Pagination parameters (page, pageSize)
 * @returns Array of lists for the given page
 */
export async function getLists(params: GetListsParams) {
  const response = await axios.get(`/api/v1/lists`, {
    params: {
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  return response.data;
}
