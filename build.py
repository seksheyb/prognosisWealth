#!/usr/bin/env python3
"""Transform downloaded Next.js SSR pages into a clean, hostable static site.

- strips the Next.js client runtime (<script> + script preloads)
- localizes the stylesheet to assets/styles.css
- rewrites internal routes ("/about" -> "about.html")
- replaces the Radix calculator widget with a vanilla mount point (#pw-calc-root)
- injects assets/app.js for interactivity
"""
import re
import os

SITE = os.path.join(os.path.dirname(__file__), "site")

ROUTES = {
    "/": "index.html",
    "/about": "about.html",
    "/services": "services.html",
    "/insights": "insights.html",
    "/calculators": "calculators.html",
    "/contact": "contact.html",
}

PAGES = ["index.html", "about.html", "services.html",
         "insights.html", "calculators.html", "contact.html"]


def rewrite_links(html: str) -> str:
    # longest routes first so "/about" matches before "/"
    for route in sorted(ROUTES, key=len, reverse=True):
        if route == "/":
            continue
        html = html.replace('href="%s"' % route, 'href="%s"' % ROUTES[route])
    # bare root link -> index.html (logo, etc.)
    html = html.replace('href="/"', 'href="index.html"')
    return html


def strip_runtime(html: str) -> str:
    # remove all <script ...>...</script> and self-closing/async scripts
    html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
    html = re.sub(r"<script\b[^>]*/?>", "", html)
    # remove <link rel="preload" as="script" ...>
    html = re.sub(r'<link[^>]*rel="preload"[^>]*as="script"[^>]*/?>', "", html)
    return html


def localize_css(html: str) -> str:
    html = re.sub(
        r'<link\b[^>]*href="/_next/static/css/[^"]*"[^>]*>',
        '<link rel="stylesheet" href="assets/styles.css"/>',
        html,
    )
    return html


def replace_calculator(html: str) -> str:
    body = html.split("<body", 1)
    if len(body) != 2:
        return html
    pre, rest = body[0], "<body" + body[1]
    start = rest.find('<div dir="ltr" data-orientation="horizontal" class="w-full">')
    if start == -1:
        return html
    cta = rest.find('<div class="mt-16 relative overflow-hidden', start)
    if cta == -1:
        return html
    mount = '<div id="pw-calc-root" class="w-full"></div>\n'
    rest = rest[:start] + mount + rest[cta:]
    return pre + rest


def inject_js(html: str) -> str:
    tag = '<script src="assets/app.js" defer></script>'
    if "</body>" in html:
        return html.replace("</body>", tag + "</body>", 1)
    return html + tag


for page in PAGES:
    path = os.path.join(SITE, page)
    with open(path, encoding="utf-8") as f:
        html = f.read()
    html = strip_runtime(html)
    html = localize_css(html)
    html = rewrite_links(html)
    if page == "calculators.html":
        html = replace_calculator(html)
    html = inject_js(html)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print("built", page, "(%d bytes)" % len(html))

print("done")
