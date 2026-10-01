#!/bin/sh
# UI tokens check: fails on one-off colours and pixel sizes in components.
#
# 1. CLAUDE.md invariant 2: blocks and the theme system reference --site-* variables only, so no
#    hex colour may appear in src/blocks or src/theme at all.
# 2. Anywhere in components: no arbitrary Tailwind colour (`bg-[#fff]`) or pixel value (`p-[13px]`).
#    Use a token (`bg-[var(--site-surface)]`) or a Tailwind scale step instead.
#
# Colours are defined in exactly two places: tenant themes (src/fixtures, later the database) and
# the dev shell's variables in src/app/globals.css.
cd "$(dirname "$0")/.." || exit 2
status=0

report() {
  echo "✘ $1"
  echo "$2" | sed 's/^/    /'
  status=1
}

hex=$(grep -rnE '#[0-9a-fA-F]{3,8}\b' src/blocks src/theme)
[ -n "$hex" ] && report "hex colour in blocks or theme (use a --site-* variable)" "$hex"

arbitrary_colour=$(grep -rnE '[a-z]-\[#[0-9a-fA-F]' src --include='*.tsx' --include='*.ts')
[ -n "$arbitrary_colour" ] && report "arbitrary colour in a class name" "$arbitrary_colour"

arbitrary_px=$(grep -rnE '[a-z]-\[-?[0-9.]+px\]' src --include='*.tsx' --include='*.ts')
[ -n "$arbitrary_px" ] && report "arbitrary pixel value in a class name" "$arbitrary_px"

[ "$status" -eq 0 ] && echo "✔ tokens: no one-off colours or pixel values"
exit "$status"
