# WMS Dashboard Frontend

Production-ready React dashboard structure with:

- Feature-based modular architecture
- Centralized API communication layer
- JWT-ready auth management with dummy login/logout
- Protected routing
- React Query caching to prevent duplicate API calls on same page revisit

## Tech Stack

- React + Vite
- React Router
- TanStack React Query
- Axios
- Tailwind CSS

## Run Project

Node Version:
```
v22.23.1
```

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=
VITE_USE_MOCK_API=true
```

- `VITE_USE_MOCK_API=true`: uses built-in dummy API adapter.
- Set `VITE_USE_MOCK_API=false` and configure `VITE_API_BASE_URL` to connect to real backend.

## Project Structure

```txt
src/
  app/
    App.jsx
    providers/
      AppProviders.jsx
      queryClient.js
    router/
      AppRouter.jsx

  core/
    api/
      httpClient.js
      mockAdapter.js
      queryKeys.js
    config/
      env.js
    storage/
      tokenStorage.js

  features/
    auth/
      api/
        authApi.js
      components/
        ProtectedRoute.jsx
      context/
        AuthContext.jsx
      hooks/
        useAuth.js
      pages/
        LoginPage.jsx
    dashboard/
      api/
        dashboardApi.js
      hooks/
        useDashboardSummary.js
      pages/
        DashboardPage.jsx

  App.jsx                  # Existing large dashboard UI module
  main.jsx                 # Bootstraps app with providers + router
```

## Implemented Auth Flow (Dummy)

1. User visits `/` -> guarded by `ProtectedRoute`
2. If not logged in -> redirect to `/login`
3. Login submits to `/auth/login` (mock) -> receives dummy JWT token
4. Token + user stored in localStorage
5. Authenticated calls include `Authorization: Bearer <token>`
6. Logout clears token, user, and query cache

## API Communication Setup

- `core/api/httpClient.js` contains centralized Axios client.
- Request interceptor automatically attaches JWT token.
- Response interceptor clears auth on 401.
- `mockAdapter.js` simulates backend endpoints for local development.

## No Duplicate API Calls on Same Page Revisit

The setup uses React Query with caching:

- `staleTime` is configured (default 5 minutes, dashboard summary 10 minutes)
- `refetchOnMount: false`
- `refetchOnWindowFocus: false`
- Shared `queryKey` per API resource

Result: revisiting the same page reuses cached data instead of calling API again immediately.

## How To Add New Feature Modules

For each new feature, follow this folder pattern:

```txt
features/<feature-name>/
  api/
    <feature>Api.js
  hooks/
    use<FeatureData>.js
  components/
    <FeatureWidget>.jsx
  pages/
    <FeaturePage>.jsx
```

### Step-by-step

1. **Create API module**
   - Add request methods in `features/<feature>/api`.
2. **Create query hook**
   - Use `useQuery`/`useMutation` in `features/<feature>/hooks`.
   - Add stable query keys in `core/api/queryKeys.js`.
3. **Create page/components**
   - Keep presentational UI in `components`.
   - Keep route-level orchestration in `pages`.
4. **Register route**
   - Add route in `app/router/AppRouter.jsx`.
5. **Auth requirement**
   - Wrap private pages with `ProtectedRoute`.
6. **Handle errors/loading**
   - Keep loading and error states inside feature pages/components.

## Production Notes

- Replace mock adapter with real API (`VITE_USE_MOCK_API=false`).
- Keep token refresh logic in `httpClient` interceptors if backend supports refresh endpoint.
- Add unit tests and integration tests for auth and API hooks before release.
