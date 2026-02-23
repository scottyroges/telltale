# Known Issues

Issues that are known but not yet prioritized for fixing. These should be addressed eventually but are not blocking current work.

---

## Authentication Doesn't Work on Vercel Branch Previews

**Status:** Not fixed
**Severity:** Medium (affects testing on preview deployments)
**Discovered:** 2026-02-22

**Problem:**
- Authentication (sign-in/sign-up) doesn't work on Vercel branch preview deployments
- Only affects preview environments, production works fine
- Makes it difficult to test auth-related features on PRs before merging

**Possible causes:**
- Better Auth redirect URLs may not be configured for preview domains
- Environment variables might be missing or incorrect on preview deployments
- Cookie domain settings may be too restrictive for Vercel preview URLs
- OAuth callback URLs may need to be updated in Google Cloud Console

**Impact:**
- Cannot fully test authentication flows on branch previews
- Must merge to main or test locally to verify auth changes

**Next steps:**
- Investigate Better Auth configuration for dynamic preview URLs
- Check Vercel environment variable settings for preview deployments
- Review OAuth provider settings (Google) for allowed redirect URLs
- Consider using Vercel's preview deployment environment variables

---
