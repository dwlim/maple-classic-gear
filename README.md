# Maple Gearbook

A small static site for building and sharing MapleStory Classic gear loadouts. Choose equipment from the live OSMS Data Explorer catalog, then choose compatible scrolls and set the quantity of each that landed. The total is capped by the equipment's upgrade-slot count. The catalog is fetched from the [OSMS items API](https://osmsdataexplorer.com/data/api/v1/items.json) when the page loads. Equipment names, categories, base stats, slot counts, scroll targets, success rates, and scroll stats come from that catalog; compatibility includes weapon type and the game's `Other` scroll family.

The equipment panel uses the inventory screenshot supplied for the project as its background (`assets/equipment-inventory.png`), with clickable text slots layered over it.

Supported slots are Head, Earring, Top, Bottom, Overall, Cape, Glove, Shoes, Weapon, Shield, and Pet Equip. The current OSMS equipment catalog has no Pet Equip entries, so that slot is shown but disabled until the source includes compatible items.

## Sharing and privacy

There is no account or server database. Loadouts are encoded in the URL fragment and saved in the current browser's local storage. The fragment is not sent to the website host in an HTTP request. Anyone with a copied link can view the character name, world, class, level, selected item IDs, and scroll quantities included in that link. On page load, the browser requests the public OSMS item catalog; character details and loadouts are not sent with that request.

## Run locally

Open `index.html` in a browser, or run:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deploy with GitHub Pages

In the repository settings, open **Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save. GitHub Pages will serve `index.html` at `https://dwlim.github.io/maple-classic-gear/`.

MapleStory is a trademark of Nexon. This is an unofficial fan project and is not affiliated with or endorsed by Nexon.
