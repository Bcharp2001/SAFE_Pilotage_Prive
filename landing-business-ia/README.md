# Landing Business IA V8

**STAGING SITE - NOT YET PRODUCTION READY**

This is an isolated landing page for S.A.F.E. Pilotage Privé's business IA offering, prepared for deployment on two domains for future A/B testing.

## Status: 🚧 STAGED - AWAITING RELEASE CLEARANCE

**DO NOT DEPLOY TO PRODUCTION** - See [RELEASE_GATES.md](./RELEASE_GATES.md) for complete list of blockers.

## Deployment Architecture

This subfolder is designed to be deployed as a **separate Vercel project** using the `rootDirectory` setting:

- **rootDirectory**: `landing-business-ia`
- **Target domains**: 
  - `mon-business-ia-prive.fr` (acquired via IONOS)
  - `mon-ia-pro-prive.fr` (acquired via IONOS)
- **Deployment**: Static HTML (no build step required)
- **Isolated**: Completely separate from existing `safe-pilotage-prive.fr` deployment

## Content

- **index.html**: Self-contained landing page with inline CSS and JavaScript
- **media/**: Images only (hero images, poster)
  - ❌ Video excluded pending rights clearance
  - ❌ Audio/VTT excluded pending rights clearance
- **vercel.json**: Clean URLs configuration

## Key Features

- Mobile-responsive design
- White/blue-green color scheme
- Three Cal.com CTAs linking to: `https://cal.com/bertrand-charpilloz-rzpbo6/30min`
- Consultation offer clearly stated: 4 000 € HT for one-week audit
- Core promise: Pilot enterprise from smartphone with local private AI
- `noindex` meta tag (remove before production)

## Core Promise & Positioning

✅ **What we promise:**
- Pilot your enterprise from smartphone
- Local private AI installed in your premises
- Consult your numbers without waiting for your teams
- Data processed on-site on dedicated machine

❌ **What we do NOT promise:**
- Absolute GDPR compliance guarantees (it helps but requires proper setup)
- Real-time data (depends on software connections)
- Absolute security (proper security setup required)
- No contact form collecting data on this page

## Content Compliance

### ✅ Approved Content
- Generic client example: "Une entreprise du bâtiment"
- Core service offering and pricing
- Bertrand's verified professional background
- Cal.com consultation link
- Generic use cases (sales, purchasing, inventory, cash flow)

### ❌ Excluded Content (Not Yet Approved/Cleared)
- Maison Artech specific testimonials/metrics
- Video content (rights pending)
- Audio content (rights pending)
- Fabricated case studies or claims
- Unverified SIRET/legal details

## Local Testing

```bash
# Serve locally with any static server:
cd landing-business-ia
python3 -m http.server 8000
# Open http://localhost:8000
```

Test checklist:
- Desktop browsers (Chrome, Firefox, Safari)
- Mobile browsers (iOS Safari, Android Chrome)
- All 3 Cal.com CTAs open correctly in new tab
- Menu navigation (#pilotage, #quoi, #donnees, #audit, #bertrand)
- Hero image loads
- Layout readable on all screen sizes
- Video placeholder displays appropriately

## A/B Testing Plan

**Status**: Not yet implemented - DO NOT FABRICATE

Two domains acquired for future testing:
- Primary: `mon-business-ia-prive.fr`
- Variant: `mon-ia-pro-prive.fr`

**Next decision needed**: Choose A/B test variable
- Headline variant?
- CTA wording?
- Offer presentation?
- Price positioning?

Do NOT create fabricated variants or fake analytics. Document the chosen variable when decision is made.

## Legal & Compliance

- **Repository**: PUBLIC (GitHub)
- **SEO**: noindex meta tag present (staging)
- **GDPR**: No contact form, no data collection on page (Cal.com external)
- **Legal pages**: ⚠️ NOT YET COMPLETE - blocker for production

## Critical Release Blockers

See [RELEASE_GATES.md](./RELEASE_GATES.md) for complete details:

1. ❌ Video/audio rights clearance
2. ❌ Verified legal information (SIRET, mentions légales)
3. ⏸️ Vercel project creation with rootDirectory
4. ⏸️ Domain DNS configuration
5. ⏸️ A/B test variant decision

## Contact

- **Consultant**: Bertrand Charpilloz
- **Email**: bertrand@safe-pilotage-prive.fr
- **Location**: Grimaud
- **Service area**: Golfe de Saint-Tropez, Draguignan, Fréjus/Saint-Raphaël

## Repository Structure

```
/workspace/
├── [existing root site files for safe-pilotage-prive.fr]
├── landing-business-ia/          ← THIS SUBFOLDER (isolated)
│   ├── index.html
│   ├── media/
│   │   ├── dirigeant-deplacement-smartphone-ia-privee-*.webp
│   │   ├── dirigeant-deplacement-smartphone-ia-privee-960.jpg
│   │   └── ia-locale-safe-pilotage-prive-poster.jpg
│   ├── vercel.json
│   ├── README.md
│   └── RELEASE_GATES.md
└── vercel.json                    ← Root config (existing site)
```

**IMPORTANT**: Root repository files remain completely untouched. Existing `safe-pilotage-prive.fr` deployment unaffected.
