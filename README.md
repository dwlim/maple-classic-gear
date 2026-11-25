# Maple Gearbook

A static, build-free site for creating and sharing MapleStory Classic gear loadouts. The interface reads equipment, scroll, and stat data from the public OSMS Data Explorer catalog when it loads.

## Features

- Equip Head, Earring, Top, Bottom, Overall, Cape, Glove, Shoes, Weapon, Shield, and Pet Equip slots. Overall items occupy the Top slot and block Bottom; two-handed weapons block Shield.
- Find equipment in the OSMS catalog and choose compatible scrolls, including how many succeeded. Generic failed scrolls consume upgrade slots without adding stats.
- Adjust an item's clean base stat roll within the supported variance range. Gear bonuses include clean stat selections and successful scroll bonuses.
- Save changes automatically in this browser, share a loadout link, or export the item detail cards as a PNG.
- View item requirements, class eligibility, weapon type and speed, stats, remaining upgrade slots, and item art.

The equipment inventory background is stored at `assets/equipment-inventory.png`. Pet Equip uses the locally hosted Red Top Hat image at `assets/red-top-hat.png`. Other equipment icons are loaded from the OSMS catalog's `icon_url` values.

Image export uses the locally bundled `html-to-image` v1.11.11 library under the MIT license; see `assets/vendor/html-to-image.LICENSE`.

## Sharing and privacy

The site has no account system or server database. Loadouts are saved in the current browser's local storage and encoded in the URL fragment. New share links use gzip compression when the browser supports the Compression Streams API; older link formats remain readable. The URL fragment is not sent to GitHub Pages in an HTTP request. Anyone with the link can view its loadout data. The browser requests the public OSMS item catalog at startup; the loadout is not sent with that request.

## Project files

- `index.html` contains the page structure and loads the local stylesheet and application script.
- `styles.css` contains the page and responsive layout styles.
- `app.js` contains catalog loading, equipment and scroll logic, local persistence, share links, and image export.
- `assets/` contains local images and the image export library.

## Run locally

From the repository directory, start a local HTTP server:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Serving over HTTP is needed for the browser to fetch the OSMS catalog.

## Deploy with GitHub Pages

In repository settings, open **Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save. GitHub Pages serves the site at <https://dwlim.github.io/maple-classic-gear/>.

MapleStory is a trademark of Nexon. This is an unofficial fan project and is not affiliated with or endorsed by Nexon.
