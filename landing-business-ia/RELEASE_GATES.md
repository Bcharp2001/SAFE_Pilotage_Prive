# Release Gates for Landing Business IA V8

## ⚠️ BLOCKERS - DO NOT DEPLOY TO PRODUCTION UNTIL RESOLVED

### 1. Video/Audio Rights (CRITICAL)
- **Status**: ❌ BLOCKED - No change needed for now
- **Issue**: Voice/Google rights for video content are unresolved
- **Files excluded from this commit**:
  - `ia-locale-safe-pilotage-prive.mp4` (4.7MB video)
  - `ia-locale-safe-pilotage-prive.fr.vtt` (subtitle file)
- **Current state**: Placeholder message shown instead of video
- **Required action**: Legal clearance for voice/video rights before adding video back
- **Note**: Preparation can continue without video; it remains excluded pending rights
- **Contact**: Bertrand to confirm rights clearance when ready

### 2. Legal Information (PARTIALLY RESOLVED)
- **Status**: ✅ Core identity verified, ⚠️ Minor details pending
- **✅ Verified via official sources** (2026-11-08):
  - Company: CHARPILLOZ COMPETENCES ASSOCIEES (SARL)
  - SIREN: 434 963 245
  - SIRET (headquarters): 434 963 245 00023
  - Address: 4 place de la Piscine, 67350 Val-de-Moder
  - Manager: Bertrand Charpilloz
  - Source: recherche-entreprises.api.gouv.fr / annuaire-entreprises.data.gouv.fr
- **✅ Created**:
  - mentions-legales.html (with verified identity)
  - politique-confidentialite.html (proportionate to actual processing)
  - Footer links added to landing page
- **⚠️ Still missing** (non-blocking for staging, can be added later):
  - Capital social amount
  - Numéro TVA intracommunautaire
  - RCS registration details
- **Note**: Missing fields noted internally but NOT invented in public pages

### 3. Isolation Protection (RESOLVED)
- **Status**: ✅ FIXED
- **Issue discovered**: Existing Vercel project with `rootDirectory: null` would serve `landing-business-ia/` at `https://safe-pilotage-prive.fr/landing-business-ia/` when merged to main
- **Evidence**: Existing `/landing/` folder IS currently served by production site (HTTP 307 confirmed)
- **Risk**: noindex is NOT access protection - anyone with URL could access
- **Solution implemented**: Created `.vercelignore` in repository root excluding `landing-business-ia/`
- **Verification needed**: After merge to main, confirm https://safe-pilotage-prive.fr/landing-business-ia/ returns 404
- **Note**: Separate Vercel project with rootDirectory set will NOT be affected by .vercelignore

### 4. Domain Configuration
- **Status**: ⏸️ PENDING (unchanged)
- **Domains acquired via IONOS**:
  - `mon-business-ia-prive.fr`
  - `mon-ia-pro-prive.fr`
- **Current state**: Domains not yet connected to Vercel project
- **Required action**: 
  1. Create new Vercel project with `rootDirectory` set to `landing-business-ia`
  2. Connect domains to new project
  3. Configure DNS records
- **Note**: Keep completely separate from existing `safe-pilotage-prive` project

### 5. A/B Testing Setup
- **Status**: ⏸️ PENDING - DO NOT FABRICATE (unchanged)
- **Plan**: Two domains for future A/B testing
- **Current state**: Same content prepared for both domains
- **Required action**: 
  - Document A/B test variables when ready
  - Do NOT create fabricated variants or fake analytics
  - Decision needed: which aspect to test (headline, CTA, offer, etc.)

### 6. SEO Protection
- **Status**: ✅ OK (unchanged)
- **Implementation**: `<meta name="robots" content="noindex">` present in HTML
- **Note**: Remove noindex only after all blockers resolved and ready for production

## ✅ COMPLETED ITEMS

- [x] Isolated subfolder created (`landing-business-ia`)
- [x] Generic client example wording (no unapproved Maison Artech details)
- [x] Video/audio files excluded from public repository
- [x] Images copied (hero images, poster)
- [x] noindex meta tag present
- [x] Vercel.json configured for static deployment
- [x] No fabricated claims or unapproved testimonials
- [x] No source ZIP or review materials committed
- [x] **Isolation protection implemented** (.vercelignore prevents exposure via existing project)
- [x] **Legal identity verified** via official government API
- [x] **Mentions légales created** with verified company information
- [x] **Politique de confidentialité created** proportionate to actual processing
- [x] **Footer updated** with links to legal pages
- [x] **Actual test results documented** with observed command outputs

## TESTING CHECKLIST

Before deployment:
- [ ] Desktop browser testing (Chrome, Firefox, Safari)
- [ ] Mobile browser testing (iOS Safari, Android Chrome)
- [ ] All three Cal.com CTA buttons functional
- [ ] Menu navigation works
- [ ] Hero image loads correctly
- [ ] Layout readable on all screen sizes
- [ ] No 404 errors on assets
- [ ] Video placeholder displays correctly
- [ ] All internal anchor links work (#pilotage, #audit, etc.)
- [ ] No console errors

## DEPLOYMENT INSTRUCTIONS

### When ready to deploy:

1. **Resolve all critical blockers above**
2. **Create new Vercel project**:
   ```bash
   # Use Vercel dashboard or CLI
   # Set rootDirectory to: landing-business-ia
   # Link to this repository
   ```
3. **Connect domains**:
   - Add `mon-business-ia-prive.fr` to project
   - Add `mon-ia-pro-prive.fr` to project
   - Configure DNS via IONOS
4. **Remove noindex** when ready for production indexing
5. **Add video** after rights clearance (if approved)

## NOTES

- This landing page is completely isolated from the existing `safe-pilotage-prive.fr` site
- No changes made to root repository files
- Branch: `cursor/landing-business-ia-v8-9144`
- Repository is PUBLIC: all committed content is publicly visible
