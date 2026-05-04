import { getNewsReadModel } from '../queries/news-query';

export async function getNewsStreamData() {
  return getNewsReadModel();
}
