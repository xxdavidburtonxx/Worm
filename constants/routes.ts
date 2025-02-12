export const ROUTES = {
  AUTH: "/auth",
  TABS: "/(tabs)",
  ADD_BOOKS: "/auth/add-books",
  FIND_FRIENDS: "/auth/find-friends",
  ONBOARDING: "/auth/onboarding"
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES]; 