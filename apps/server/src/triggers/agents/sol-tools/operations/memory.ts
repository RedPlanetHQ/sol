import axios from 'axios';

import { RetrieveMemoryParams } from '../types/memory';

export const retrieveMemory = async (params: RetrieveMemoryParams) => {
  const { queries } = params;
  const responses = await Promise.all(
    queries.map(async (query) => {
      const response = await axios.post(`https://sol::core_memory`, {
        query,
      });
      return response.data;
    }),
  );

  return responses;
};
