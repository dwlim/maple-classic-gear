# Maple Gearbook

A small static site for building and sharing MapleStory Classic gear loadouts. Click a supported slot, enter an item and its bonuses, then copy a link to share the full loadout. Supported slots are Head, Earring, Top, Bottom, Overall, Cape, Glove, Shoes, Weapon, Shield, and Pet Equip.

## Sharing and privacy

There is no account or server database. Loadouts are encoded in the URL fragment and saved in the current browser's local storage. The fragment is not sent to the website host in an HTTP request. Anyone with a copied link can view the character name, world, class, level, item names, upgrade notes, and bonuses included in that link.

## Run locally

Open `index.html` in a browser, or run:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deploy with GitHub Pages

In the repository settings, open **Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save. GitHub Pages will serve `index.html` at `https://dwlim.github.io/maple-classic-gear/`.

MapleStory is a trademark of Nexon. This is an unofficial fan project and is not affiliated with or endorsed by Nexon.
