# Release Gates for Landing Business IA V8

## ⚠️ BLOCKERS - DO NOT DEPLOY TO PRODUCTION UNTIL RESOLVED

### 1. Video/Audio Rights (CRITICAL)
- **Status**: ❌ BLOCKED
- **Issue**: Voice/Google rights for video content are unresolved
- **Files excluded from this commit**:
  - `ia-locale-safe-pilotage-prive.mp4` (4.7MB video)
  - `ia-locale-safe-pilotage-prive.fr.vtt` (subtitle file)
- **Current state**: Placeholder message shown instead of video
- **Required action**: Legal clearance for voice/video rights before adding video back
- **Contact**: Bertrand to confirm rights clearance

### 2. Legal Information (CRITICAL)
- **Status**: ❌ BLOCKED
- **Issue**: SIRET and legal address not yet verified
- **Missing**:
  - Verified SIRET number
  - Verified legal address
  - Complete "Mentions légales" page
  - Complete "Politique de confidentialité" page
- **Current state**: Footer has minimal info, no legal pages linked
- **Required action**: Verify and add complete legal information
- **Note**: Do NOT invent or fabricate legal information

### 3. Domain Configuration
- **Status**: ⏸️ PENDING
- **Domains acquired via IONOS**:
  - `mon-business-ia-prive.fr`
  - `mon-ia-pro-prive.fr`
- **Current state**: Domains not yet connected to Vercel project
- **Required action**: 
  1. Create new Vercel project with `rootDirectory` set to `landing-business-ia`
  2. Connect domains to new project
  3. Configure DNS records
- **Note**: Keep separate from existing `safe-pilotage-prive` project

### 4. A/B Testing Setup
- **Status**: ⏸️ PENDING - DO NOT FABRICATE
- **Plan**: Two domains for future A/B testing
- **Current state**: Same content prepared for both domains
- **Required action**: 
  - Document A/B test variables when ready
  - Do NOT create fabricated variants or fake analytics
  - Decision needed: which aspect to test (headline, CTA, offer, etc.)

### 5. SEO Protection
- **Status**: ✅ OK
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
