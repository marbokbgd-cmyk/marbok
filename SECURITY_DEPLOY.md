# Commercial portal deployment

- Revoke the Sanity write token committed in this public Git history and configure a new `SANITY_API_TOKEN` in Vercel. Keep it server-only and configure the same replacement on the main Marbok project.
- This portal relies on Firebase ID token verification in middleware and in API handlers. Test owner login, category prices, orders, Excel offer and store selection on a Vercel preview before deploying to production.
- Keep `NEXT_PUBLIC_SITE_VARIANT=commercial` for the commercial deployment. The Firebase owner address is configured in `config/site.js`.
- After all other consumers of this Sanity dataset have moved to authenticated server reads, change the dataset to private. Until then a direct Sanity API query can still read prices and customer records despite the login screen.
- Review Firebase Firestore and Storage rules separately. Client login does not secure direct Firebase API access.
