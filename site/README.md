# Will My Crypto: site and prototype tools

Plain static site: HTML, CSS, vanilla JavaScript, one small PHP form handler. No build step, no dependencies, no CDNs.
**Early preview. Not independently audited. Not legal, tax or financial advice. The site never holds, moves or sees your crypto, keys or seed phrase. Never type a real seed phrase, private key or wallet password into any web page, including this one.**

## Pages
| Page | What it is | Code |
|---|---|---|
| `quiz.html` | Inheritance Readiness Score | `js/quiz.js` |
| `letter.html` | Encrypted letter (AES-256-GCM, PBKDF2-SHA256) | `js/letter.js`, `js/guard.js` |
| `plan.html` | Heirs, check-in schedule, letter + Shamir shares | `js/plan.js`, `js/wmc-crypto.js`, `js/shamir.js`, `js/sim-core.js` |
| `simulator.html` | Time-lapse of missed check-ins and release | `js/simulator.js`, `js/sim-core.js` |
| `claim.html` | Heir combines shares and opens the letter | `js/claim.js` |
| `encryption.html` | "How hard is it to crack?": exact numbers, sand-grain animation, guess machine, passphrase tester | `js/strength.js`, `js/meter.js`, `js/crack.js` |
| `trust.html` | Open-source statement, formats, how to verify | |
| (server side) | Small server-side scripts send the partner form and the optional quiz email, and keep a daily tally of three events (quiz started, quiz email submitted, partner form submitted), described in `privacy.html`. They are not part of the public repository. | |

## Design
Navy/teal with a gold accent. Fonts are self-hosted (Inter, Instrument Serif; SIL OFL, see `fonts/FONTS.txt`). Effects (`js/fx.js`: word reveal, scroll reveal, cursor glow, tilt) are plain JS/CSS and switch off under `prefers-reduced-motion`. Logo files: `logo/*.svg`, `favicon.svg`, `og-image.png`.
`js/strength.js` holds the brute-force maths and the passphrase-strength estimate. These are estimates under stated assumptions, not guarantees.

## Tests
```
node tests/run.js        # Node 18+, no dependencies
```
Covers Shamir (all k-subsets, too few shares, mixed plans, typos), letter lock/unlock (wrong passphrase, tampering, a fixture made by `letter.html`), the full letter + split + claim round trip, the check-in schedule, the secret guard, and the strength/brute-force maths (23 tests, including checks that only the quiz page can contact the counter, that the demo pages still block all network connections, that the error pages are self-contained, and that robots.txt, sitemap.xml and the canonical links stay correct).

Shares can also be combined without this site: `tools/combine_shares.py.txt` (rename to `.py`).

## Search engines
The site is open to search engines. `robots.txt` allows everything and points to `sitemap.xml`, which lists the public pages. Each page has a canonical link to its plain https://willmycrypto.com/ URL (the home page is `/`, not `/index.html`). Only the error pages are noindex. `google61256378fec7394e.html` is the Google Search Console verification file; keep it in place.

## Checksums
`./make-checksums.sh` regenerates `checksums.txt` (SHA-256 of each served file).

## Formats
- Locked letter: Base64 JSON `{v,alg,kdf,iter,salt,iv,ct}` between BEGIN/END lines. Key = PBKDF2-SHA256(passphrase NFKC, salt, iter), AES-256-GCM, AAD `wmc-letter-v1`.
- Share: `WMC1.<setid>.<k>.<n>.<x>.<base64url>.<crc32>`; Shamir over GF(256) (poly 0x11b).

## License
MIT. See `LICENSE.txt`. `js/guard.js` embeds the BIP-39 English wordlist (BSD-2-Clause).
