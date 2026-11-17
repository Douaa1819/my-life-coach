import { type Href } from 'expo-router';

/** Typed-routes on Windows omit some dynamic files; cast once here. */
export const goalHrefs = {
  list: '/goals' as Href,
  create: '/goal/new' as Href,
  detail: (id: string) => `/goal/${id}` as Href,
  edit: (id: string) => `/goal/edit/${id}` as Href,
};
