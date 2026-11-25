# Maple Gearbook

A small static site for building and sharing MapleStory Classic gear loadouts. Choose equipment from the live OSMS Data Explorer catalog, then choose compatible scrolls and set the quantity of each that landed. The total is capped by the equipment's upgrade-slot count. The catalog is fetched from the [OSMS items API](https://osmsdataexplorer.com/data/api/v1/items.json) when the page loads. Equipment names, categories, base stats, slot counts, scroll targets, success rates, and scroll stats come from that catalog; compatibility includes weapon type and the game's `Other` scroll family.

The equipment panel uses the inventory screenshot supplied for the project as its background (`assets/equipment-inventory.png`), with clickable slots layered over it. Equipped item art and item picker thumbnails load from the `icon_url` images in the OSMS catalog.

Gear changes save automatically as soon as an item, base stat, or scroll quantity changes; the modal's **Done** button only closes it. When editing an item, its unscrolled base stats can be adjusted from the OSMS clean value. Values below 10 allow ±1 and values of 10 or more allow ±5, with a floor of zero. These adjusted values are included in local saves and shared links.

Equipped item details render beside the inventory by default in a screenshot-friendly grid of MapleStory-style windows. They include adjusted and scrolled stats, requirements, job eligibility, weapon type and speed, remaining enhancement slots, and OSMS item images. Use **Print / Save PDF** above the item details to capture the equipment and all item windows together. Gear totals, character settings, and sharing controls appear below.

Supported slots are Head, Earring, Top or Overall, Bottom, Cape, Glove, Shoes, Weapon, Shield, and Pet Equip. Overall items appear in the Top position and disable the Bottom position. The current OSMS equipment catalog has no Pet Equip entries, so that slot is shown but disabled until the source includes compatible items.

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
