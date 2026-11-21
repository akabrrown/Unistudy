import os
import re
import glob
import json

app_dir = os.path.abspath('frontend/src/app')
pages = glob.glob(os.path.join(app_dir, '**', 'page.tsx'), recursive=True)

results = []

for p in sorted(pages):
    rel_path = os.path.relpath(p, app_dir).replace('\\', '/')
    with open(p, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Also include companion files in same folder (e.g., Client components, modals)
    dir_name = os.path.dirname(p)
    companion_content = ''
    for root, dirs, files in os.walk(dir_name):
        for file in files:
            if file.endswith('.tsx') and file != 'page.tsx' and not file.endswith('.test.tsx'):
                comp_path = os.path.join(root, file)
                try:
                    with open(comp_path, 'r', encoding='utf-8', errors='ignore') as cf:
                        companion_content += '\n' + cf.read()
                except Exception:
                    pass

    full_code = content + '\n' + companion_content

    ai_tells = []
    human_craft = []

    # Check if pure redirect-only route (no JSX returned)
    is_pure_redirect = bool('redirect(' in content and not re.search(r'return\s+[\(<][\s\S]*>', content))
    if is_pure_redirect:
        results.append({
            'path': rel_path,
            'cluster': cluster,
            'human_pct': 100,
            'ai_pct': 0,
            'is_redirect': True,
            'ai_tells': ['N/A (Server-side redirect route)'],
            'human_craft': ['Server-side route orchestration']
        })
        continue
    # 1. Palette & Brand Check
    has_generic_gradient = bool(re.search(r'from-purple|to-pink|from-violet|via-fuchsia|to-indigo|from-indigo|bg-gradient-to-r\s+from-\w+-\d+\s+to-\w+-\d+', full_code, re.I))
    if has_generic_gradient:
        ai_tells.append('Generic purple/indigo/pink AI gradient')
    
    has_upsa_palette = bool(re.search(r'#00004E|#D89A06|primary/|text-primary|bg-primary|UPSA|upsa', full_code))
    if has_upsa_palette:
        human_craft.append('Authentic UPSA Navy (#00004E) & Gold tokens')

    # 2. Iconography & Clichés
    has_sparkles = bool(re.search(r'\bSparkles\b', full_code))
    if has_sparkles:
        ai_tells.append('AI Sparkles icon cliché')

    # 3. Visual Layout & Grid Hierarchy
    has_boilerplate_grid = bool(re.search(r'grid-cols-1\s+md:grid-cols-3\s+gap-[468]', full_code) and ('Card' in full_code or 'rounded-xl' in full_code))
    if has_boilerplate_grid:
        ai_tells.append('Boilerplate 3-column card grid')

    has_asymmetric_or_tabs = bool(re.search(r'Tabs|Sheet|Drawer|Resizable|ScrollArea|Accordion|Sidebar|Bento|grid-cols-12', full_code))
    if has_asymmetric_or_tabs:
        human_craft.append('Complex asymmetric / tabbed ergonomic layout')

    # 4. Copywriting & Voice
    has_ai_buzzwords = bool(re.search(r'Unlock your|Elevate your|Supercharge|seamlessly|delve into|game-changer|revolutionary|testament to', full_code, re.I))
    if has_ai_buzzwords:
        ai_tells.append('Generic AI marketing buzzwords')

    has_academic_domain = bool(re.search(r'Level\s+\d{3}|FITCS|FAF|FMS|UPSA Law|GWA|Degree Programme|Course Code|semester|Credit Hours|Faculty|Socratic|Paystack|GHS|Past Paper', full_code, re.I))
    if has_academic_domain:
        human_craft.append('Domain-deep UPSA academic terminology')

    # 5. UI States (Loading, Empty, Error, Success)
    has_loading = bool(re.search(r'loading|skeleton|spinner|animate-pulse', full_code, re.I))
    has_empty = bool(re.search(r'empty|no\s+\w+\s+found|nothing here|no\s+results', full_code, re.I))
    has_error = bool(re.search(r'error|try again|failed to|toast\.error|alert', full_code, re.I))

    if not has_loading and ('fetch' in full_code.lower() or 'usequery' in full_code.lower() or 'async' in full_code.lower()):
        ai_tells.append('Missing dedicated loading/skeleton state')
    else:
        human_craft.append('Handled loading / async state')

    if not has_empty and ('map(' in full_code or 'list' in full_code.lower()):
        ai_tells.append('Missing explicit empty-state view')
    elif has_empty:
        human_craft.append('Handled empty-state zero data')

    if not has_error and ('try {' in full_code or 'catch' in full_code):
        ai_tells.append('Silent or basic error banner')
    elif has_error:
        human_craft.append('Explicit error feedback / toast')

    # 6. Ergonomics, A11y & Interactions
    has_motion = bool(re.search(r'motion/react|framer-motion|animate-in', full_code))
    if has_motion:
        human_craft.append('Hardware-accelerated Framer Motion transitions')

    has_a11y = bool(re.search(r'aria-|role=|sr-only|tabIndex', full_code))
    if has_a11y:
        human_craft.append('Accessible semantic ARIA roles')

    # Weighted scoring
    # AI Penalty weight: up to 100
    ai_score = len(ai_tells) * 16.6
    # Human Craft weight: up to 100
    human_score = len(human_craft) * 16.6

    total = ai_score + human_score
    if total == 0:
        human_pct = 70
        ai_pct = 30
    else:
        human_pct = int(min(max((human_score / total) * 100, 10), 96))
        ai_pct = 100 - human_pct

    # Determine Cluster
    cluster = 'Other'
    if rel_path.startswith('(auth)/'):
        cluster = 'Auth & Onboarding'
    elif rel_path.startswith('admin/'):
        cluster = 'Admin Command Center'
    elif rel_path.startswith('dashboard/'):
        cluster = 'Student Dashboard & Tools'
    elif rel_path in ['page.tsx', 'features/page.tsx', 'how-it-works/page.tsx', 'pricing/page.tsx', 'brand/page.tsx', 'contact/page.tsx', 'terms/page.tsx', 'privacy/page.tsx', 'cookies/page.tsx', 'academic-integrity/page.tsx']:
        cluster = 'Public & Marketing'

    results.append({
        'path': rel_path,
        'cluster': cluster,
        'human_pct': human_pct,
        'ai_pct': ai_pct,
        'ai_tells': ai_tells,
        'human_craft': human_craft
    })

results.sort(key=lambda x: x['human_pct'])

# Write report JSON
with open('frontend/src/audit_results.json', 'w', encoding='utf-8') as out:
    json.dump(results, out, indent=2)

cluster_stats = {}
for r in results:
    c = r['cluster']
    if c not in cluster_stats:
        cluster_stats[c] = {'human': [], 'ai': []}
    cluster_stats[c]['human'].append(r['human_pct'])
    cluster_stats[c]['ai'].append(r['ai_pct'])

print('--- CLUSTER SUMMARY ---')
for c, vals in cluster_stats.items():
    avg_h = sum(vals['human']) / len(vals['human'])
    avg_a = sum(vals['ai']) / len(vals['ai'])
    count = len(vals['human'])
    print(f"{c} ({count} pages): {avg_h:.1f}% Human / {avg_a:.1f}% AI")

overall_h = sum(r['human_pct'] for r in results) / len(results)
overall_a = 100 - overall_h
print(f"\nOVERALL PLATFORM AVERAGE: {overall_h:.1f}% Human UI / {overall_a:.1f}% AI UI\n")

# Generate Markdown Audit Table
by_cluster = {}
for r in results:
    c = r['cluster']
    if c not in by_cluster:
        by_cluster[c] = []
    by_cluster[c].append(r)

md_lines = []
md_lines.append("# Forensic UI/UX Audit: Human Craft vs. AI Scaffolding Analysis\n")
md_lines.append(f"**Platform Composite Score:** **{overall_h:.1f}% Human UI Craft** vs. **{overall_a:.1f}% AI Scaffolding**\n")
md_lines.append("## Cluster Overview\n")
md_lines.append("| Surface Cluster | Routes | Human Craft % | AI Tells % | Primary Vulnerability |")
md_lines.append("|---|---|---|---|---|")
for c, vals in cluster_stats.items():
    avg_h = sum(vals['human']) / len(vals['human'])
    avg_a = sum(vals['ai']) / len(vals['ai'])
    vuln = "Missing edge states" if avg_a > 25 else "Generic gradient / cards" if avg_a > 20 else "Polished"
    md_lines.append(f"| {c} | {len(vals['human'])} | **{avg_h:.1f}%** | {avg_a:.1f}% | {vuln} |")

md_lines.append("\n---\n")

for c, items in by_cluster.items():
    avg_h = sum(x['human_pct'] for x in items) / len(items)
    avg_a = 100 - avg_h
    md_lines.append(f"## {c} ({len(items)} routes — {avg_h:.1f}% Human / {avg_a:.1f}% AI)\n")
    md_lines.append("| Route | Human % | AI % | Identified AI Tells & Anti-Patterns | Key Human Craft Markers |")
    md_lines.append("|---|---|---|---|---|")
    for item in sorted(items, key=lambda x: x['human_pct']):
        tells = "<br>".join(f"• {t}" for t in item['ai_tells']) if item['ai_tells'] else "None (Clean Human UI)"
        craft = "<br>".join(f"✓ {cr}" for cr in item['human_craft'][:3]) if item['human_craft'] else "Standard UI"
        p_clean = item['path'].replace('\\', '/')
        md_lines.append(f"| `{p_clean}` | **{item['human_pct']}%** | {item['ai_pct']}% | {tells} | {craft} |")
    md_lines.append("\n")

with open('frontend/AUDIT_REPORT.md', 'w', encoding='utf-8') as f:
    f.write("\n".join(md_lines))

print("Audit report written to frontend/AUDIT_REPORT.md")

