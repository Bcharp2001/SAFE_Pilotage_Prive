#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, os

dirs = [d for d in os.listdir(os.path.expanduser('~')) if 'SAFE_Pilotage' in d and 'capture' not in d]
BASE = os.path.join(os.path.expanduser('~'), dirs[0])
OG_IMAGE = "https://www.safe-pilotage-prive.fr/favicon-512x512.png"

print("Depot : " + BASE)

pages = {
    "index.html": {
        "title": "S.A.F.E. Pilotage Priv\u00e9 | IA Souveraine & Cockpit Op\u00e9rationnel pour PME",
        "desc": "S.A.F.E. d\u00e9ploie une IA locale et souveraine sur vos donn\u00e9es sensibles. Z\u00e9ro cloud public, performance maximale, conformit\u00e9 RGPD garantie.",
        "og_title": "S.A.F.E. Pilotage Priv\u00e9 | IA Souveraine pour PME",
        "og_desc": "S.A.F.E. d\u00e9ploie une IA locale et souveraine sur vos donn\u00e9es sensibles. Z\u00e9ro cloud public, performance maximale.",
        "canonical": "https://www.safe-pilotage-prive.fr/",
        "add_canonical": True,
    },
    "a-propos.html": {
        "title": "Bertrand Charpilloz \u2014 Fondateur S.A.F.E. Pilotage Priv\u00e9",
        "desc": "Bertrand Charpilloz, expert en IA souveraine et structuration d'entreprise. Concepteur de S.A.F.E. Pilotage Priv\u00e9, l'IA locale pour les organisations exigeantes.",
        "og_title": "Bertrand Charpilloz \u2014 Fondateur S.A.F.E. Pilotage Priv\u00e9",
        "og_desc": "Expert en IA souveraine et structuration d'entreprise. Concepteur de S.A.F.E. Pilotage Priv\u00e9.",
        "canonical": "https://www.safe-pilotage-prive.fr/a-propos",
        "add_canonical": True,
    },
    "solutions/direction-strategie.html": {
        "title": "IA Souveraine pour Direction PME : Strat\u00e9gie & D\u00e9cision | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/solutions/direction-strategie",
    },
    "solutions/commercial.html": {
        "title": "IA Ventes PME : Prospection & Fid\u00e9lisation Souveraine | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/solutions/commercial",
    },
    "solutions/rh-paie.html": {
        "title": "IA RH & Paie PME : Solution Souveraine & S\u00e9curis\u00e9e | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/solutions/rh-paie",
    },
    "solutions/finance-comptabilite.html": {
        "title": "IA Comptabilit\u00e9 & Finance PME : Solution Souveraine | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/solutions/finance-comptabilite",
    },
    "solutions/juridique-compliance.html": {
        "title": "IA Juridique & Compliance PME : Souverainet\u00e9 Garantie | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/solutions/juridique-compliance",
    },
    "solutions/operations.html": {
        "title": "IA Op\u00e9rations PME : Gestion des Connaissances & RAG | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/solutions/operations",
    },
    "solutions/achats-stock.html": {
        "title": "IA Achats & Stock PME : Optimisez votre Gestion | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/solutions/achats-stock",
    },
    "professions/index.html": {
        "title": "IA Souveraine pour Professions R\u00e9glement\u00e9es | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/professions",
    },
    "professions/notaires.html": {
        "title": "IA Souveraine pour Notaires : Secret Professionnel Garanti | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/professions/notaires",
    },
    "professions/avocats.html": {
        "title": "IA S\u00e9curis\u00e9e pour Avocats : Jurisprudence & Confidentialit\u00e9 | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/professions/avocats",
    },
    "professions/experts-comptables.html": {
        "title": "IA RAG pour Experts-Comptables : Moins de Saisie, Plus de Conseil | S.A.F.E.",
        "canonical": "https://www.safe-pilotage-prive.fr/professions/experts-comptables",
    },
}

# robots.txt
with open(os.path.join(BASE, "robots.txt"), "w", encoding="utf-8") as f:
    f.write("User-agent: *\nAllow: /\n\nSitemap: https://www.safe-pilotage-prive.fr/sitemap.xml\n")
print("[OK] robots.txt")

# sitemap.xml
urls_prio = [
    ("/", "1.0"), ("/a-propos", "0.8"),
    ("/solutions/direction-strategie", "0.8"), ("/solutions/commercial", "0.8"),
    ("/solutions/rh-paie", "0.8"), ("/solutions/finance-comptabilite", "0.8"),
    ("/solutions/juridique-compliance", "0.8"), ("/solutions/operations", "0.8"),
    ("/solutions/achats-stock", "0.8"),
    ("/professions", "0.9"), ("/professions/notaires", "0.9"),
    ("/professions/avocats", "0.9"), ("/professions/experts-comptables", "0.9"),
]
sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
for u, p in urls_prio:
    sitemap += '  <url><loc>https://www.safe-pilotage-prive.fr' + u + '</loc><lastmod>2026-03-20</lastmod><priority>' + p + '</priority></url>\n'
sitemap += "</urlset>\n"
with open(os.path.join(BASE, "sitemap.xml"), "w", encoding="utf-8") as f:
    f.write(sitemap)
print("[OK] sitemap.xml")


def fix(path, c):
    full = os.path.join(BASE, path)
    if not os.path.exists(full):
        print("  [SKIP] " + path)
        return
    html = open(full, encoding="utf-8").read()
    orig = html

    if "title" in c:
        html = re.sub(r"<title>[^<]*</title>", "<title>" + c["title"] + "</title>", html)

    if "desc" in c:
        if re.search(r'<meta\s+name="description"', html):
            html = re.sub(r'<meta\s+name="description"\s+content="[^"]*"',
                          '<meta name="description" content="' + c["desc"] + '"', html)
        else:
            html = re.sub(r"(<title>[^<]*</title>)",
                          r'\1' + '\n  <meta name="description" content="' + c["desc"] + '" />', html)

    if "canonical" in c:
        if re.search(r'<link\s+rel="canonical"', html):
            html = re.sub(r'<link\s+rel="canonical"\s+href="[^"]*"[^>]*>',
                          '<link rel="canonical" href="' + c["canonical"] + '" />', html)
        elif c.get("add_canonical"):
            html = html.replace("</head>",
                                '  <link rel="canonical" href="' + c["canonical"] + '" />\n</head>')

    if "og_title" in c:
        if re.search(r'<meta\s+property="og:title"', html):
            html = re.sub(r'<meta\s+property="og:title"\s+content="[^"]*"',
                          '<meta property="og:title" content="' + c["og_title"] + '"', html)
        else:
            og = ('  <meta property="og:title" content="' + c["og_title"] + '" />\n'
                  '  <meta property="og:description" content="' + c.get("og_desc", "") + '" />\n'
                  '  <meta property="og:image" content="' + OG_IMAGE + '" />\n'
                  '  <meta property="og:type" content="website" />\n'
                  '  <meta property="og:url" content="' + c["canonical"] + '" />\n')
            html = html.replace("</head>", og + "</head>")

    if "og_desc" in c and re.search(r'<meta\s+property="og:description"', html):
        html = re.sub(r'<meta\s+property="og:description"\s+content="[^"]*"',
                      '<meta property="og:description" content="' + c["og_desc"] + '"', html)

    if not re.search(r'<meta\s+property="og:image"', html) and re.search(r'<meta\s+property="og:title"', html):
        html = re.sub(r'(<meta\s+property="og:title"[^>]*>)',
                      r'\1' + '\n  <meta property="og:image" content="' + OG_IMAGE + '" />', html)

    if html != orig:
        open(full, "w", encoding="utf-8").write(html)
        print("  [OK] " + path)
    else:
        print("  [INCHANGE] " + path)


print("\n=== Corrections SEO ===")
for path, c in pages.items():
    fix(path, c)

print("\nTermine ! Lancez maintenant :")
print("  cd ~/" + dirs[0])
print("  git add -A && git commit -m 'SEO: sitemap, robots.txt, balises meta/title/canonical/OG' && git push")
