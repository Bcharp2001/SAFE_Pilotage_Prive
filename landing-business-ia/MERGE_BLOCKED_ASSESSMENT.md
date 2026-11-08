# MERGE BLOCKED - Isolation Not Proven

## Date: 2026-11-08 09:17 UTC
## Status: ⛔ **DO NOT MERGE TO MAIN**

---

## CRITICAL ISSUE: Isolation Solution Unproven

### Problem Confirmed
```bash
$ curl -sL https://safe-pilotage-prive.fr/landing/safe-business-ia | grep -o "<title>[^<]*</title>"
<title>SAFE Business IA — Vos premiers agents IA privés en 30 jours | S.A.F.E. Pilotage Privé</title>
```

**Evidence**: Existing `/landing/` folder serves actual HTML content (not just 404).

### Attempted Solution: .vercelignore (REMOVED - UNPROVEN)

**Problem with .vercelignore**:
1. ❌ No official Vercel documentation found confirming it works for Git deployments
2. ❌ May only apply to CLI deployments (`vercel` command)
3. ❌ No empirical evidence from actual preview/deployment
4. ❌ Added root file despite goal of avoiding existing project changes
5. ❌ Cannot claim "safe to merge" without proof

**Action taken**: `.vercelignore` removed from branch.

---

## ARCHITECTURAL OPTIONS (No Production Changes)

### Option 1: Keep in Branch (RECOMMENDED)
**What**: Do NOT merge to main until separate Vercel project exists

**Process**:
1. Keep PR branch `cursor/landing-business-ia-v8-9144` open
2. Create separate Vercel project NOW (before merge):
   - Project name: `landing-business-ia` (or similar)
   - Repository: Same repo (Bcharp2001/SAFE_Pilotage_Prive)
   - Branch: `cursor/landing-business-ia-v8-9144` (this branch)
   - Root Directory: `landing-business-ia`
3. Connect IONOS domains to new project
4. Test new project deployment
5. Once verified isolated, merge to main (new project keeps tracking main after merge)

**Pros**:
- ✅ Zero risk to existing site
- ✅ Isolation proven before merge
- ✅ No production changes during testing
- ✅ Can test everything in real environment

**Cons**:
- ⏰ Requires Vercel project creation first
- 🔀 Branch stays open longer

---

### Option 2: Separate Repository
**What**: Move landing-business-ia to new repository

**Process**:
1. Create new repository: `landing-business-ia`
2. Copy folder contents
3. Create Vercel project pointing to new repo
4. Connect domains
5. Original PR can close

**Pros**:
- ✅ Complete isolation guaranteed
- ✅ Clean separation of concerns

**Cons**:
- 🔧 More complex to manage
- 🔄 Harder to share assets/content
- 📦 Separate deployment pipeline

---

### Option 3: Protected Subdirectory (RISKY - Not Recommended)
**What**: Add authentication/protection to subfolder path

**Issues**:
- ❌ Requires changing existing project configuration
- ❌ Still exposes URL structure
- ❌ noindex is not protection

---

## RECOMMENDED PATH FORWARD

**OPTION 1 - Keep in Branch**:

### Immediate (Now):
1. ✅ Remove .vercelignore (done)
2. ✅ Mark PR as "DO NOT MERGE" until separate project created
3. Fix privacy policy wording (see below)
4. Review SARL capital requirement (see below)

### Before Merge:
5. Create separate Vercel project:
   - Name: `landing-business-ia`
   - Repo: Bcharp2001/SAFE_Pilotage_Prive
   - Branch: `cursor/landing-business-ia-v8-9144`
   - Root Directory: `landing-business-ia`
6. Connect mon-business-ia-prive.fr to new project
7. Verify deployment shows landing page correctly
8. Verify https://safe-pilotage-prive.fr/landing-business-ia/ still returns 404 or doesn't exist
9. Test complete functionality on new project

### After Verification:
10. Merge PR to main
11. Update new project to track main branch
12. New project continues working, isolated from old project

---

## OTHER REQUIRED CORRECTIONS

### 1. Privacy Policy Wording (INACCURATE)

**Current claim**: "Ce site ne collecte aucune donnée personnelle"

**Reality**: 
- ✅ No form collection (correct)
- ❌ Vercel hosting logs (IP addresses, timestamps, user agents)
- ❌ Email contact link exists (bertrand@safe-pilotage-prive.fr)
- ❌ Google Fonts loaded (requests to Google servers)

**Required fix**: Change to "Ce site ne collecte aucune donnée personnelle via formulaire" and mention hosting logs/email contact as actual processing.

### 2. SARL Capital Requirement (RELEASE GATE)

**French law** (Article R123-237 of Code de commerce):
For SARL, **capital social IS legally required** in mentions légales for commercial websites.

**Status**: Missing from current legal pages

**Action**: 
- ⚠️ Remains RELEASE GATE for production (not minor detail)
- Can verify via Infogreffe or similar official source
- Must be added before removing noindex

---

## CORRECTED RELEASE GATES

### ⛔ MERGE BLOCKED
1. **Isolation Not Proven**: Cannot merge until separate project exists OR alternative proven

### ❌ PRODUCTION BLOCKED
2. **Video Rights**: Pending (continues excluded)
3. **SARL Capital**: Required for French legal compliance (not optional)
4. **Privacy Policy**: Must reflect actual processing (logs, email)

### ⚠️ PENDING
5. Vercel project creation (before merge)
6. DNS configuration (after project)
7. A/B test variable decision
8. Manual browser testing

---

## EVIDENCE SUMMARY

### What We Know (Empirical)
- ✅ Existing project serves `/landing/` content (HTML verified)
- ❌ .vercelignore effectiveness unproven for Git deployments
- ❌ Cannot claim isolation without actual deployment test
- ❌ Privacy wording inaccurate
- ❌ SARL capital missing (legally required)

### What We Don't Know
- ❓ Will .vercelignore work if merged? (No documentation/evidence)
- ❓ What will happen to `/landing-business-ia/` URL after merge? (Unpredictable)

---

## RECOMMENDATION TO USER (Bertrand)

**DO NOT MERGE PR #2 TO MAIN YET**

### Path Forward:
1. **Create separate Vercel project now** (using this branch)
2. **Test deployment on new project** (verify isolation)
3. **Connect one domain for testing** (mon-business-ia-prive.fr)
4. **Verify everything works** on new project
5. **Fix privacy policy** (accurate wording)
6. **Verify SARL capital** (add to legal pages)
7. **Then merge to main** (safe because new project already working)

### Why This Approach:
- ✅ Zero risk to existing production site
- ✅ Isolation proven before merge
- ✅ Real-world testing in proper environment
- ✅ No guesswork or assumptions

---

## COMMITS TO REVERT/UPDATE

**To revert**: 
- 673d26d (added .vercelignore - unproven)
- c204a7e (claimed isolation fixed - incorrect)

**To update**:
- politique-confidentialite.html (accurate processing statement)
- mentions-legales.html (add capital social when verified)
- RELEASE_GATES.md (merge blocked, capital required)

---

**Conclusion**: Keep branch open. Create separate project. Test first. Merge after proven safe.

**No merge, no deployment, no existing project changes until isolation empirically verified.**
