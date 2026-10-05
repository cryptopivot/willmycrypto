#!/bin/sh
# Regenerates checksums.txt for files served publicly.
cd "$(dirname "$0")" && find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.txt' -o -name '*.md' -o -name '*.svg' -o -name '*.png' -o -name '*.ico' -o -name '*.woff2' \) ! -name checksums.txt ! -name '*.php' ! -path './node_modules/*' | sort | xargs sha256sum | sed 's# \./# #' > checksums.txt
