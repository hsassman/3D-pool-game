# Menu artwork (image slots)

Drop real artwork in here to replace the placeholder gradients on the Bento menu,
the Quick-Match game-type cards, and the league covers. Nothing is required - every
slot falls back to a themed gradient until you provide a file.

Recommended: landscape JPG/WebP, ~800×600 for big tiles, ~600×360 for cards/covers.

## How to switch a placeholder for a real image

Set the matching CSS variable to point at your file. The variables live in
`src/styles/main.css`:

- Bento big/medium tiles - on `#bento`:
  `--art-career`, `--art-quick`, `--art-online`, `--art-chal`, `--art-trick`, `--art-custom`
- Quick-Match game types - on `#quick-card`:
  `--art-8ball`, `--art-english`, `--art-9ball`, `--art-practice`
- League covers - on `.lg-cover-grid`:
  `--art-league1` … `--art-league5`

Example (career tile + the 8-ball / English cards the screenshots were for):

```css
#bento      { --art-career: url(public/assets/ui/career.jpg); }
#quick-card { --art-8ball:  url(public/assets/ui/8ball.jpg);
              --art-english:url(public/assets/ui/english.jpg); }
```

The single-file build (`npm run build`) automatically inlines any
`public/assets/ui/*.{png,jpg,jpeg,webp,gif,svg,avif}` it finds as a data URL, so the
shippable `dist/` file stays self-contained.
