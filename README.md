# Will My Crypto: open browser tools

Plain-language tools that help people plan how the people they love could recover their crypto if something happens to them. This repository holds the source of the browser tools behind [willmycrypto.com](https://willmycrypto.com).

> **Early preview.** The site is a noindex prototype and is not meant for real funds. **These tools have not had an independent security review.** Do not type a seed phrase or private key into them. Nothing here is legal, tax or financial advice.

## What the project is

Crypto has no "forgot password". If the owner dies or can no longer act, heirs often cannot get in. Will My Crypto is meant to be a **non-custodial** planning aid: it should never hold coins, keys or seed phrases. The tools in this repository run entirely in your browser:

- **Readiness quiz** (`quiz.html`): scores how prepared a plan is.
- **Locked letter** (`letter.html`): locks a letter of instruction with a passphrase, and opens it again.
- **Plan demo** (`plan.html`): heirs, a check-in schedule, a locked letter and Shamir shares of the passphrase.
- **Simulator** (`simulator.html`): a time-lapse of missed check-ins and what would happen.
- **Heir claim** (`claim.html`): combine shares and open the letter.
- **How hard to crack?** (`encryption.html`): the arithmetic behind brute-force guessing, and a passphrase tester.
- **Trust page** (`trust.html`): what the project commits to, and how to verify it.

The plan, simulator and claim pages only demonstrate the flow. They do not send reminders, monitor anyone or release anything. An account system, real check-in service and hosted encrypted vault are **planned and not built**.

## What is in this repository

Everything is under `site/`. It is plain HTML, CSS and JavaScript with no build step, no dependencies and no outside scripts or fonts.

```
site/
├── *.html, style.css          The pages and their styling
├── js/                        Browser code: Shamir sharing, letter locking, schedule, strength maths, seed-phrase guard
├── tests/                     Node tests (run.js) and a letter fixture
├── tools/                     combine_shares.py.txt: combine shares without the website
├── fonts/                     Inter and Instrument Serif (SIL OFL), with their license notes
├── logo/, favicons, og-image  Brand images
├── .well-known/security.txt   How to report a problem
├── checksums.txt              SHA-256 of the served files
├── make-checksums.sh          Regenerates checksums.txt
├── robots.txt                 Asks search engines not to index the preview
└── LICENSE.txt, README.md     License and a short technical overview
```

The live site also runs a small server-side form handler for the partner and quiz-email forms. It is not part of this repository, so those two forms do nothing when the files are used on their own.

## Running the tests

Requires Node 18 or newer. No packages to install.

```
cd site
npm test            # same as: node tests/run.js
```

The tests cover Shamir splitting (every k-subset, too few shares, shares from different plans, typos), locking and unlocking a letter (wrong passphrase, tampering, a letter produced by `letter.html`), a full letter, split and claim round trip, the check-in schedule, the seed-phrase guard, and the strength maths.

## The locked-letter format

A locked letter is a Base64 JSON block between BEGIN and END lines. The key comes from your passphrase with PBKDF2-SHA256, and the letter is encrypted with AES-256-GCM. The exact fields, a worked Python example for opening a letter without this website, and the reasoning are on the trust page: [`site/trust.html`](site/trust.html) (section "The locked letter format"). Shares of a passphrase use the `WMC1...` text format described in [`site/README.md`](site/README.md), and `site/tools/combine_shares.py.txt` combines them outside the site.

## Security

These tools have **not** had an independent security review. The cryptography uses the browser's standard WebCrypto functions, but the project's own code around it, including the Shamir implementation and the share format, has not been audited. Treat it as a preview.

To report a problem, use the contact in [`site/.well-known/security.txt`](site/.well-known/security.txt). Please do not send seed phrases, private keys or real secrets to anyone, including us.

## Checking the files

`site/checksums.txt` lists SHA-256 hashes of the files the live site serves. From `site/`, `sha256sum -c checksums.txt` verifies them. One listed file, `contact.php`, is deliberately not in this repository, so that single entry reports as missing.

## License

MIT, see [`site/LICENSE.txt`](site/LICENSE.txt). `site/js/guard.js` embeds the BIP-39 English wordlist (BSD-2-Clause). Fonts are under the SIL Open Font License; see `site/fonts/`.
