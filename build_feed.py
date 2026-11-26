#!/usr/bin/env python3
"""Ajoute à podcast.xml les nouveaux épisodes ALL4ONE publiés sur archive.org.

Les épisodes déjà présents dans le fichier ne sont jamais modifiés.
Les identifiants archive.org suivent le modèle all-4-one-NNN.
"""
import json
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import format_datetime
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape

FEED_FILE = "podcast.xml"
ID_PREFIX = "all-4-one-"
MAX_GAP = 3  # on s'arrête après 3 numéros consécutifs introuvables


def get_json(url):
    for attempt in range(3):
        try:
            req = Request(url, headers={"User-Agent": "all4one-feed-updater/1.0"})
            with urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            print(f"  essai {attempt + 1} échoué : {e}", file=sys.stderr)
            time.sleep(3)
    return None


def clean(s):
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", s)


def fmt_duration(v):
    if v is None:
        return None
    v = str(v).strip()
    if ":" in v:
        return v if v.count(":") == 2 else "00:" + v
    secs = int(float(v))
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def build_item(ident, num, data):
    """Retourne le bloc <item> ou None si l'épisode n'est pas encore prêt."""
    md = data["metadata"]
    mp3s = [f for f in data["files"] if f.get("name", "").lower().endswith(".mp3")]
    if not mp3s:
        return None
    mp3s.sort(key=lambda f: f.get("source") != "original")
    f = mp3s[0]
    if not f.get("size"):
        return None

    title = md.get("title") or f"ALL4ONE#{num}"
    desc = md.get("description", "")
    if isinstance(desc, list):
        desc = "\n".join(desc)

    added = md.get("addeddate") or md.get("publicdate") or ""
    try:
        dt = datetime.strptime(added, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except ValueError:
        dt = datetime.now(timezone.utc)

    url = f"https://archive.org/download/{ident}/{quote(f['name'], safe='')}"
    duration = fmt_duration(f.get("length"))

    lines = [
        "    <item>",
        f"      <title>{escape(clean(title))}</title>",
        f"      <description>{escape(clean(desc))}</description>",
        f'      <enclosure url="{escape(url, {chr(34): "&quot;"})}" length="{f["size"]}" type="audio/mpeg"/>',
        f'      <guid isPermaLink="false">{ident}</guid>',
        f"      <link>https://archive.org/details/{ident}</link>",
        f"      <pubDate>{format_datetime(dt)}</pubDate>",
        f"      <itunes:episode>{num}</itunes:episode>",
    ]
    if duration:
        lines.append(f"      <itunes:duration>{duration}</itunes:duration>")
    lines.append("    </item>")
    return "\n".join(lines) + "\n"


def main():
    with open(FEED_FILE, encoding="utf-8") as fh:
        xml = fh.read()

    known = set(re.findall(r"<guid[^>]*>\s*([^<\s]+)\s*</guid>", xml))
    nums = []
    for g in known:
        m = re.fullmatch(re.escape(ID_PREFIX) + r"(\d+)", g)
        if m:
            nums.append(int(m.group(1)))
    if not nums:
        sys.exit("Aucun épisode all-4-one-N trouvé dans le flux : arrêt.")

    n = max(nums) + 1
    gap = 0
    new_items = []
    while gap < MAX_GAP:
        ident = f"{ID_PREFIX}{n}"
        data = get_json(f"https://archive.org/metadata/{ident}")
        if data is None:
            sys.exit("archive.org injoignable : le flux n'est pas modifié.")
        if not data or "metadata" not in data:
            gap += 1
        else:
            gap = 0
            item = build_item(ident, n, data)
            if item is None:
                print(f"{ident} existe mais n'est pas encore prêt : on réessaiera.")
                break  # évite de sauter un numéro lors du prochain passage
            print(f"Nouvel épisode : {ident}")
            new_items.append((n, item))
        n += 1

    if not new_items:
        print("Rien de nouveau.")
        return

    new_items.sort(key=lambda t: t[0], reverse=True)
    block = "".join(i for _, i in new_items)

    pos = xml.index("<item>")
    pos = xml.rfind("\n", 0, pos) + 1  # début de la ligne du premier <item>
    updated = xml[:pos] + block + xml[pos:]

    ET.fromstring(updated.encode("utf-8"))  # sécurité : le XML doit rester valide

    with open(FEED_FILE, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(updated)
    print(f"{len(new_items)} épisode(s) ajouté(s).")


if __name__ == "__main__":
    main()