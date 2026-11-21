import sys
import os

sys.path.append('scripts/local')
from remove_magenta import remove_magenta_aggressive

# These are the ones we just generated
files_to_clean = [
    'climber-s-kit.png', 'lockpicks.png', 'navigator-s-tools.png', 'alexandrite.png', 'amber.png', 'amethyst.png', 'aquamarine.png', 'azurite.png', 'banded-agate.png', 'black-opal.png', 'black-pearl.png', 'black-sapphire.png', 'bloodstone.png', 'blue-quartz.png', 'blue-sapphire.png', 'blue-spinel.png',
    'carnelian.png', 'chalcedony.png', 'chrysoberyl.png', 'chrysoprase.png', 'citrine.png', 'coral.png', 'diamond.png', 'emerald.png', 'eye-agate.png', 'fire-opal.png', 'garnet.png', 'hematite.png', 'huge-ruby.png', 'jasper.png', 'jet.png', 'lapis-lazuli.png',
    'malachite.png', 'moonstone.png', 'moss-agate.png', 'obsidian.png', 'onyx.png', 'opal.png', 'pearl.png', 'peridot.png', 'quartz.png', 'rhodochrosite.png', 'ruby.png', 'sardonyx.png', 'spinel.png', 'star-rose-quartz.png', 'star-ruby.png', 'star-sapphire.png',
    'tiger-s-eye.png', 'topaz.png', 'tourmaline.png', 'turquoise.png', 'zircon.png', 'potion-of-animal-friendship.png', 'potion-of-clairvoyance.png', 'potion-of-climbing.png', 'potion-of-diminution.png', 'potion-of-flying.png', 'potion-of-gaseous-form.png', 'potion-of-giant-strength.png', 'potion-of-growth.png', 'potion-of-heroism.png', 'potion-of-invisibility.png', 'potion-of-invulnerability.png',
    'potion-of-longevity.png', 'potion-of-mind-reading.png', 'potion-of-poison.png', 'potion-of-resistance.png', 'potion-of-speed.png', 'potion-of-vitality.png', 'potion-of-water-breathing.png', 'potions-of-healing.png', 'rowboat.png', 'arrow.png', 'crossbow-bolt.png', 'quiver.png', 'plate-armor-body.png', 'buckler.png', 'tower-shield.png', 'spiked-targe.png'
]

for filename in files_to_clean:
    path = os.path.join('apps/client/public/assets/items', filename)
    if os.path.exists(path):
        remove_magenta_aggressive(path)
        print(f"Cleaned {filename}")
    else:
        print(f"File not found: {path}")
