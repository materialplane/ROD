"""Player-facing fantasy RPG lore, clean kinds, and plain service badges for all 77 Overworld sites.

Kept strictly separate from internal design-table fields (levelRange, Gear Step, Skill Tier, Chain notes),
which remain untouched for the Internal Admin Suite.
"""

from __future__ import annotations

REGION_TITLES: dict[int, str] = {
    1: "The Crownlands",
    2: "Saltmarsh Coast",
    3: "Thornwall Warfronts",
    4: "The Verdant Weald",
    5: "Sun-Scorched Isles",
    6: "Ironcrest Highlands",
    7: "Frostbound Reach",
    8: "The Dreadwaste",
}

PLAYER_LORE_BY_ID: dict[str, dict] = {
    # =========================================================================
    # REGION 1 — THE CROWNLANDS
    # =========================================================================
    "loc_01_overgrown_garden_sanctuary": {
        "playerKind": "Royal Capital City",
        "playerRegion": "The Crownlands",
        "playerDescription": "Ethoria's storied capital rises above terraced gardens, dry stone aqueducts, and the soot-stained tiers of the Great Coliseum. Though King Garrick's shadow hangs heavy over the realm, loyal banners still hold the Highcrown walls.",
        "playerServices": ["Royal Keep", "Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "loc_02_oakhaven": {
        "playerKind": "Walled Heartland Town",
        "playerRegion": "The Crownlands",
        "playerDescription": "Sheltered beneath ancient oaks behind stout fieldstone walls, Oakhaven thrives on ringing forge-hammers, harvest granaries, and lively courtyard bouts. Folk across the meadows still gather at its hearthfires for news from the capital.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_meadowbrook_hamlet": {
        "playerKind": "Heartland Farming Hamlet",
        "playerRegion": "The Crownlands",
        "playerDescription": "Split-rail pastures and timber wheat barns ring this peaceful hamlet tucked among sunlit green hills. Since unnatural beasts began prowling closer to the flocks, village herders keep lanterns burning well past dusk.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "loc_04_millbrook_crossing": {
        "playerKind": "Frontier Village",
        "playerRegion": "The Crownlands",
        "playerDescription": "Built by Crownlands millers and limestone masons beneath creaking windmill sails. Now weary travelers gather round its hearthfires while raiders prowl outside the palisade and ash vents stir nearby chalk-pits.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "hub_crownlands_hill_fort": {
        "playerKind": "Border Watch-Fort",
        "playerRegion": "The Crownlands",
        "playerDescription": "Timber palisades and dressed stone parapets crown these rocky hills where royal outriders watch for tremors from the wilds. Cracked beacons and rusting halberd crates speak to nights spent holding back creatures of living iron.",
        "playerServices": ["Rest Barracks", "Armory & Provisions"],
    },
    "loc_05_the_ashen_gate": {
        "playerKind": "Dimensional Rift Gate",
        "playerRegion": "The Crownlands",
        "playerDescription": "A towering arch of scorched basalt humming with furnace heat from Earth and Forge. Ancient smith-wards bar the way; sailors whisper its lost keystone sank near Saltwind's reefs.",
        "playerServices": [],
    },
    # =========================================================================
    # REGION 2 — SALTMARSH COAST
    # =========================================================================
    "loc_06_saltwind_harbor": {
        "playerKind": "Fortified Coastal Port",
        "playerRegion": "Saltmarsh Coast",
        "playerDescription": "Weathered sandstone seawalls embrace deep emerald waters where merchant galleons unload timber, salt, and rumor from distant shores. Battered dockside fighting rings draw bold blades between high tides.",
        "playerServices": ["Ship Port", "Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_brinecliff_watch_fort": {
        "playerKind": "Sea-Cliff Fortress",
        "playerRegion": "Saltmarsh Coast",
        "playerDescription": "Carved into pale salt-spray limestone overlooking jagged coastal shoals, this patrol fort watches smugglers' coves and mist-wrapped sea caves. Watchers keep oil braziers lit whenever strange shapes surface beyond the breakers.",
        "playerServices": ["Rest Barracks", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "hub_reedfen_village": {
        "playerKind": "Marsh Fishing Village",
        "playerRegion": "Saltmarsh Coast",
        "playerDescription": "Steep reed-thatched cottages cling to firm marsh turf surrounded by hanging nets, flat-bottomed skiffs, and willow haze. Fisherfolk mend gear by smoky lantern light while abyssal tides litter nearby shores with wreckage.",
        "playerServices": ["Free Inn", "Armory & Provisions"],
    },
    "loc_09_mirewatch_post": {
        "playerKind": "Marshland Stilt Outpost",
        "playerRegion": "Saltmarsh Coast",
        "playerDescription": "Raised on heavy oak pilings above whispering reeds and dark brackish pools, Mirewatch shelters marsh wardens and herbalists braving the deep fens. Smudge fires burn day and night against venomous fog and bog horrors.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "hub_tidewater_keep": {
        "playerKind": "Coastal Bastion Keep",
        "playerRegion": "Saltmarsh Coast",
        "playerDescription": "Wave-scarred granite walls guard the outer headland where deep-sea storms beat ceaselessly against royal masonry. Veterans sharpen spears inside its chain-ringed courtyard while keeping tense watch toward the abyssal surf.",
        "playerServices": ["Rest Barracks", "Armory & Provisions", "Fighting Arena"],
    },
    "loc_10_the_sunken_maw": {
        "playerKind": "Dimensional Rift Gate",
        "playerRegion": "Saltmarsh Coast",
        "playerDescription": "Barnacle-crusted tidal monoliths form a drowned sea-arch pulsing with cold abyssal light from the Plane of Water. Sea captains speak of a luminous brine-pearl guarded by beasts near Tidewater's outer cliffs.",
        "playerServices": [],
    },
    # =========================================================================
    # REGION 3 — THORNWALL WARFRONTS
    # =========================================================================
    "loc_11_redmarch_bastion": {
        "playerKind": "Warfront Garrison Town",
        "playerRegion": "Thornwall Warfronts",
        "playerDescription": "Red-gray ashlar battlements rise proudly above sunlit ochre meadows where royal regiments muster against highland treachery. Its iron portcullis opens onto busy armor halls, crowded inns, and a sand-strewn garrison ring.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_goldmoor_village": {
        "playerKind": "Highland Farming Village",
        "playerRegion": "Thornwall Warfronts",
        "playerDescription": "Golden straw roofs and open timber stables sit tucked amidst rolling sweeps of highland grass and wind-bent barley. Farmers keep pitchforks close beside the hearth as border skirmishes stray ever nearer the pastures.",
        "playerServices": ["Free Inn", "Armory & Provisions"],
    },
    "hub_slatepeak_mining_fort": {
        "playerKind": "Quarry Fortress",
        "playerRegion": "Thornwall Warfronts",
        "playerDescription": "Set straight into chiseled slate crags, this soot-stained stronghold feeds armorers with smelted pig iron and whetstone. Miners now bar the deeper tunnels against lurking ridge beasts.",
        "playerServices": ["Rest Barracks", "Armory & Provisions"],
    },
    "hub_thornwall_border_castle": {
        "playerKind": "Frontier Ridge Citadel",
        "playerRegion": "Thornwall Warfronts",
        "playerDescription": "Heavy highland granite walls frown across contested valleys toward House Hollowstone's lands. Loyalists hold its high battlements with grim resolve while signal fires flash warnings between watchtowers at dusk.",
        "playerServices": ["Rest Barracks", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "loc_13_hollowstone_keep": {
        "playerKind": "Contested Noble Stronghold",
        "playerRegion": "Thornwall Warfronts",
        "playerDescription": "Spired in dark slate and draped in wine-purple silk, House Hollowstone's fortress defies the crown behind spiked gates and a tourney yard. Whispers tell of captives locked beneath its walls.",
        "playerServices": ["Stronghold", "Fighting Arena"],
    },
    "loc_15_the_iron_rift": {
        "playerKind": "Dimensional Rift Gate",
        "playerRegion": "Thornwall Warfronts",
        "playerDescription": "Riveted iron girders and scarred granite jambs frame a blistering gateway roaring with war-drums from the Blood-Iron Warlands. Rumors among captured quarrymen trace its molten seal to stone-giant pickets guarding the high crags.",
        "playerServices": [],
    },
    # =========================================================================
    # REGION 4 — THE VERDANT WEALD
    # =========================================================================
    "loc_16_briarstead": {
        "playerKind": "Walled Forest Town",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Sweet dried sage, pine resin, and beeswax hang beneath steep timber gables inside this sanctuary walled against the ancient woods. Healers and woodsfolk fill its square while darker spores begin creeping out from deeper groves.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_timberfall_village": {
        "playerKind": "Woodland Logging Village",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Freshly cut cedar beams and mossy shingle roofs gather inside a sunlit clearing under towering woodland boughs. Foremen count every axe and lantern before dusk falls over the overgrown timber trails.",
        "playerServices": ["Free Inn", "Armory & Provisions"],
    },
    "hub_mosswood_hamlet": {
        "playerKind": "Forest Shrine Hamlet",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Cottages of weathered oak stone cluster gently around moss-cloaked monoliths older than the kingdom itself. Passing bards and hermits linger by the shrine spring even as creeping ooze threatens the quiet paths.",
        "playerServices": ["Free Inn", "Armory & Provisions"],
    },
    "hub_greenwarden_fort": {
        "playerKind": "Forest Ranger Fort",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Sharpened oak-log ramparts and watchtowers brace this forest redoubt holding the line between emerald glades and blighted undergrowth. Rangers pack antitoxin vials and hone broadheads beside an inner sparring pit.",
        "playerServices": ["Rest Barracks", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_blightwatch_keep": {
        "playerKind": "Quarantine Fortress",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Fierce pitch-braziers burn ceaselessly outside dark limestone walls shielding the borderlands from creeping fungal rot. Soldiers bolt the iron gates nightly against withered beasts emerging from the poisoned mist.",
        "playerServices": ["Rest Barracks", "Armory & Provisions"],
    },
    "loc_20_the_rotspire": {
        "playerKind": "Dimensional Rift Gate",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Gnarled roots and luminous lichen coil around a sunken forest arch choking the surrounding canopy with sickly emerald spores. Quarantine chaplains believe only hardened amber plucked from the quarantine gate can pierce its seal.",
        "playerServices": [],
    },
    # =========================================================================
    # REGION 5 — SUN-SCORCHED ISLES
    # =========================================================================
    "loc_21_port_veridia": {
        "playerKind": "Desert Spice Harbor",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "Pale limestone arcades draped in saffron and sea-teal silks look across gleaming turquoise waters thick with spice galleons and trader barges. Behind the bazaar clang blades inside a sun-baked coastal fighting ring.",
        "playerServices": ["Ship Port", "Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_sunstone_caravan_post": {
        "playerKind": "Desert Caravan Outpost",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "Carved beside golden dunes above deep sandstone water cellars, this bustling caravanserai offers shade, cold well-water, and stout packs to merchants crossing shimmering wastes.",
        "playerServices": ["Free Inn", "Armory & Provisions"],
    },
    "loc_23_dunespire_oasis": {
        "playerKind": "Oasis Caravan Hub",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "Woven merchant tents and brass lanterns circle a jewel-clear palm spring shimmering amidst endless dunes. Scholars pore over ancient desert ruins by candlelight while guards watch the sandbars for burrowing terrors.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "hub_sandwall_citadel": {
        "playerKind": "Sandstone Frontier Citadel",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "Sun-baked orange sandstone walls tower above desert canyons where free-town defenders hold back raiders and winged desert drakes. Soldiers drill beneath copper banners surrounding an open-air sand arena.",
        "playerServices": ["Rest Barracks", "Armory & Provisions", "Fighting Arena"],
    },
    "loc_24_gilded_auction_manor": {
        "playerKind": "Cartel Estate Stronghold",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "Ornate hammered-bronze domes and high spiked walls conceal the Slaver Syndicate's brutal gilded stronghold and sand-pit yard. Beyond the locked iron gates whisper informants longing to shatter the cartel's chains forever.",
        "playerServices": ["Stronghold", "Fighting Arena"],
    },
    "loc_25_the_scorched_chasm": {
        "playerKind": "Dimensional Rift Gate",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "A towering sun-blistered arch of sandstone and tarnished brass radiating furnace gusts from the Elemental Plane of Fire. Caravan elders tell of a brass cinder-seal carried off by fire-born raiders prowling near the gilded cliffs.",
        "playerServices": [],
    },
    # =========================================================================
    # REGION 6 — IRONCREST HIGHLANDS
    # =========================================================================
    "loc_26_highpass_refuge": {
        "playerKind": "Alpine Ridge Town",
        "playerRegion": "Ironcrest Highlands",
        "playerDescription": "Steep slate-shingled homes cling cleanly across lush green mountain ridges above clear highland valleys and pine gorges. Mountaineers trade raw star-iron and warm hearthfire before climbing the upper crags.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_clearwater_lake_village": {
        "playerKind": "Lakeside Highland Village",
        "playerRegion": "Ironcrest Highlands",
        "playerDescription": "Wooden piers reach into crystal sapphire alpine water ringed by evergreen meadows and gray granite peaks. Pilgrims and fishers pause in quiet comfort beneath clear mountain skies.",
        "playerServices": ["Free Inn", "Armory & Provisions"],
    },
    "loc_27_anvilhall_forge": {
        "playerKind": "Grand Mountain Smithy",
        "playerRegion": "Ironcrest Highlands",
        "playerDescription": "Hollowed straight from living highland granite, roaring bellows and cascading sparks illuminate rows of legendary armor and an inner trial ring. Smiths from across Ethoria revere its ancient anvils above all others.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_cragwatch_fort": {
        "playerKind": "Highland Ridge Fort",
        "playerRegion": "Ironcrest Highlands",
        "playerDescription": "Dressed granite parapets stand exposed to biting alpine gales along treacherous ridge approaches. Garrison scouts maintain bright signal braziers and rope-bridges against highland giants and swooping beasts.",
        "playerServices": ["Rest Barracks", "Armory & Provisions"],
    },
    "hub_stormhold_citadel": {
        "playerKind": "Tempest Highland Citadel",
        "playerRegion": "Ironcrest Highlands",
        "playerDescription": "Crowned with weathered copper lightning-rods beneath gathering thunderheads, this monumental mountain citadel guards the high ridges. Champions gather inside its drenched stone ring to test steel before the storm-lit peaks.",
        "playerServices": ["Rest Barracks", "Armory & Provisions", "Fighting Arena"],
    },
    "loc_30_storm_crowned_spire": {
        "playerKind": "Dimensional Rift Gate",
        "playerRegion": "Ironcrest Highlands",
        "playerDescription": "Crackling sky-bolts dance across a carved granite gateway opening toward the windswept Elemental Plane of Air and Dragon Crags. Rangers below Stormhold's walls tell of storm-giants hoarding the gate's crackling lodestone.",
        "playerServices": [],
    },
    # =========================================================================
    # REGION 7 — FROSTBOUND REACH
    # =========================================================================
    "loc_31_rimeport": {
        "playerKind": "Frozen Sea Harbor",
        "playerRegion": "Frostbound Reach",
        "playerDescription": "Ice-locked timber quays and glowing coal braziers welcome hardy sailors braving drifting glacial floes. Thick-bundled shipwrights hammer frozen oak planks beside a roaring harbor fighting pit.",
        "playerServices": ["Ship Port", "Free Inn", "Armory & Provisions", "Mystic & Herbalist", "Fighting Arena"],
    },
    "hub_frostmere_village": {
        "playerKind": "Snowbound Trapper Village",
        "playerRegion": "Frostbound Reach",
        "playerDescription": "Snow-weighted log cabins flicker warmly with amber hearthlight along the rim of a silent frozen lake. Trappers cure wolf pelts and trade heavy winter furs under frost-rimmed conifers.",
        "playerServices": ["Free Inn", "Armory & Provisions"],
    },
    "hub_glacierwatch_fort": {
        "playerKind": "Glacial Border Fortress",
        "playerRegion": "Frostbound Reach",
        "playerDescription": "Wedged beneath towering cliffs of translucent blue glacier ice, this dark granite fortress defies freezing gales and pale fiends alike. Cold clan banners fly proudly beside crackling iron watch-fires.",
        "playerServices": ["Rest Barracks", "Armory & Provisions"],
    },
    "hub_icecrest_holdfast": {
        "playerKind": "Clan Stone Holdfast",
        "playerRegion": "Frostbound Reach",
        "playerDescription": "An ancient timber longhall ringed by stout clan fieldstone stands defiant amidst frozen pines. Free jarls and freed thralls share horn-mead and forge cold steel against Marshal Bleakwatch's rule.",
        "playerServices": ["Rest Barracks", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "loc_34_bleakwatch_citadel": {
        "playerKind": "Warlord Ice Stronghold",
        "playerRegion": "Frostbound Reach",
        "playerDescription": "Jagged spiked iron battlements and frost-glazed black stone mark the seat of the self-proclaimed northern warlord. Rebels gather along its frozen approaches while drums echo from a bloodstained ice fighting pit within.",
        "playerServices": ["Stronghold", "Fighting Arena"],
    },
    "loc_35_the_pale_abyss": {
        "playerKind": "Dimensional Rift Gate",
        "playerRegion": "Frostbound Reach",
        "playerDescription": "A frost-choked arch of black basalt breathing freezing hellfire from the deepest pits of the Abyss. Defectors from Bleakwatch whisper of an ice-locked seal held behind the warlord's bridgehead bastions.",
        "playerServices": [],
    },
    # =========================================================================
    # REGION 8 — THE DREADWASTE
    # =========================================================================
    "loc_36_ashenford_war_camp": {
        "playerKind": "Forward Rebel War-Camp",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "Iron-ribbed command tents and glowing siege braziers stand stubbornly upon black volcanic ash where rebel banners prepare the final push. Armorers and mystics arm champions for the shadowed siege ahead.",
        "playerServices": ["Free Inn", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "hub_cinderwatch_bastion": {
        "playerKind": "Volcanic Frontier Bastion",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "Jagged basalt walls anchor the smoking ash-scree borderlands where sentries hold back dark cultists and creeping shadow. Orange oil-lamps guide stragglers safely behind iron-shuttered gates.",
        "playerServices": ["Rest Barracks", "Armory & Provisions"],
    },
    "hub_ashvale_village": {
        "playerKind": "Fortified Ash-Basin Village",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "Squat stone cottages lit by stubborn candlelight shelter displaced families and weathered veterans amidst soot-covered hills. Elders guard tattered royal archives and tend wounded travelers.",
        "playerServices": ["Free Inn", "Armory & Provisions"],
    },
    "hub_scorchwall_fort": {
        "playerKind": "Obsidian Coastal Fort",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "Perched above dark haunted swells beside smoking volcanic bluffs, this fortress overlooks the final bleak approaches toward Black Keep. Royal scholars and hardened blades watch the horizon around blazing iron cages.",
        "playerServices": ["Rest Barracks", "Armory & Provisions", "Mystic & Herbalist"],
    },
    "loc_40_garricks_black_keep": {
        "playerKind": "Obsidian Royal Stronghold",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "Spired in volcanic black basalt beneath an eclipsed twilight sky, King Garrick's dark fortress towers over the scarred ashlands. Inside its breached outer bailey gather Ethoria's vanguard for the final reckoning.",
        "playerServices": ["Rest Barracks", "Armory & Provisions"],
    },
    "loc_39_the_eclipse_gate": {
        "playerKind": "Dimensional Rift Gate",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "A colossal temple archway of blackened silver and volcanic stone tearing open toward the Shadowfell itself. Heavy eclipse-wards lock the threshold; only breaking the inner throne seals will force the final gate wide.",
        "playerServices": [],
    },
    # =========================================================================
    # ALL 20 ZONE OUTPOSTS
    # =========================================================================
    "outpost_z01_meadowgate": {
        "playerKind": "Meadow Palisade Fort",
        "playerRegion": "The Crownlands",
        "playerDescription": "Sunlit Crownlands oak-timber palisade hunting fort with a pointed gatehouse tower, hitching rails, and lantern-lit trophy arches where royal scouts post silver bounties on beasts prowling the meadows.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z02_oakwood": {
        "playerKind": "Woodland Palisade Fort",
        "playerRegion": "The Crownlands",
        "playerDescription": "Sun-dappled oak-log palisade stockade fort fitted with a bark-shingled gatehouse, drying frames, bow racks, and a stone fire-ring where Crownlands rangers coordinate patrols through the oak groves.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z03_slate_ridge": {
        "playerKind": "Foothill Scout Outpost",
        "playerRegion": "The Crownlands",
        "playerDescription": "Gray-slate hillside bunker with a low timber palisade, brass signal horn, and map table overlooking rugged upland ridges and nearby raider hills.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z04_brinefen": {
        "playerKind": "Coastal Palisade Sea-Fort",
        "playerRegion": "Saltmarsh Coast",
        "playerDescription": "Salt-weathered coastal stone-and-driftwood palisade sea-fort stacked with crab cages, harpoon racks, and watch lanterns where shoreline trackers post bounties on tide-pool creatures.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z05_bogwarden": {
        "playerKind": "Saltmarsh Palisade Fort",
        "playerRegion": "Saltmarsh Coast",
        "playerDescription": "Elevated cypress-timber saltmarsh palisade fort anchored on thick wooden pilings amidst cattail reeds, hung with netting and smoking smudge pots where mire wardens cull bog monsters.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z06_ochre_downs": {
        "playerKind": "Highland Palisade Fort",
        "playerRegion": "Thornwall Warfronts",
        "playerDescription": "Earth-and-oak frontier palisade fort with corner watchtowers, an enclosed horse paddock, and crossbow bales set across golden-ochre grasslands where trackers post bounties on prowling pasture packs.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z07_cragspire": {
        "playerKind": "Quarry Watch-Post",
        "playerRegion": "Thornwall Warfronts",
        "playerDescription": "Gray-slate stone outpost tucked beneath jagged crag boulders beside a glowing brazier, staffed by highland wardens paying silver to clear ridge beasts.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z08_fernbrook": {
        "playerKind": "Forest Clearing Station",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Moss-roofed timber station set inside a sunny Weald clearing with fletching benches and stacked lumber where border scouts watch the deeper woods.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z09_canopy_watch": {
        "playerKind": "Treetop Palisade Fort",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Enclosed cedar palisade treetop fort wedged securely around ancient oaks with rope hoists, archer galleries, and brass signal horns keeping vigil beneath tangled forest boughs.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z10_mire_edge": {
        "playerKind": "Quarantine Perimeter Camp",
        "playerRegion": "The Verdant Weald",
        "playerDescription": "Timber perimeter palisade lit by green lime-smoke braziers and apothecary racks where wardens hire brave blades to thin spore-touched horrors from the glade.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z11_dune_runner": {
        "playerKind": "Desert Palisade Fort",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "Sun-baked sandstone-and-cedar desert palisade fort fitted with spiked stockade ramparts, clay water amphorae, and spear stands where desert outriders pay silver bounties for hunting sandstone beasts.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z12_palm_spring": {
        "playerKind": "Oasis Palisade Fort",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "Desert palm-oasis fortified sandstone-and-timber palisade outpost with corner watchtowers, bleached desert trophies, and brass lanterns where caravan guards water mounts and post hunting contracts.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z13_mesa_watch": {
        "playerKind": "Sandstone Mesa Post",
        "playerRegion": "Sun-Scorched Isles",
        "playerDescription": "Terracotta sandstone shelter fitted with a brass spyglass scanning desert canyon rims for sweeping wyverns and cartel outriders.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z14_pine_valley": {
        "playerKind": "Alpine Hunter Lodge",
        "playerRegion": "Ironcrest Highlands",
        "playerDescription": "Steep slate-roofed timber lodge set amidst sunny green meadows and pine groves with curing pelts and a stone fire-ring where wardens post alpine bounties.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z15_highland_crag": {
        "playerKind": "Granite Ridge Bunker",
        "playerRegion": "Ironcrest Highlands",
        "playerDescription": "Windswept gray granite bunker ringed with scarred ward shields and pike racks standing watch beneath stormy highland peaks.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z16_snowdrift": {
        "playerKind": "Frozen Taiga Outpost",
        "playerRegion": "Frostbound Reach",
        "playerDescription": "Fur-draped log trapper post beside cargo sleds and glowing oil lamps tucked into frosted pines where northern hunters track frost-beasts.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z17_glacier_edge": {
        "playerKind": "Glacial Watch Redoubt",
        "playerRegion": "Frostbound Reach",
        "playerDescription": "Cobalt ice-cliff stone redoubt fortified with silvered iron ward stakes and cold-flame braziers holding back creatures spilling off the glaciers.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z18_ashen_ridge": {
        "playerKind": "Ash-Border Bunkhouse",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "Iron-shuttered gray stone bunker astride volcanic scree where vanguard scouts track wandering horrors crossing the ashen wastes.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z19_cinder_plain": {
        "playerKind": "Vanguard Ash Stockade",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "Spiked iron-and-canvas stockade burning orange braziers across charred wasteland flats where veteran slayers post rich dreadwaste bounties.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    "outpost_z20_black_crag": {
        "playerKind": "Basalt Slayer Outpost",
        "playerRegion": "The Dreadwaste",
        "playerDescription": "Final obsidian-basalt outpost outside Black Keep consecrated under silvered ward banners where elite hunters strike at Shadowfell monsters.",
        "playerServices": ["Rest Camp", "Hunter Bounties"],
    },
    # =========================================================================
    # TRAVEL PORTS, FERRIES & MOUNTAIN PASS
    # =========================================================================
    "tr_port_map01_royal_trade": {
        "playerKind": "Sea-Trade Harbor",
        "playerRegion": "Southern Coast",
        "playerDescription": "Royal timber piers moored with deep-water trading ships bound across the open seas between Ethoria's four island continents.",
        "playerServices": ["Sea Voyages", "Free Harbor Rest"],
    },
    "tr_port_map02_highland_cove": {
        "playerKind": "Sea-Trade Harbor",
        "playerRegion": "Thornwall Cove",
        "playerDescription": "Sheltered cliff cove anchorage where weather-beaten cargo vessels haul Highland iron and carry travelers to distant continent shores.",
        "playerServices": ["Sea Voyages", "Free Harbor Rest"],
    },
    "tr_port_map03_desert_harbor": {
        "playerKind": "Sea-Trade Harbor",
        "playerRegion": "Sun-Scorched Bay",
        "playerDescription": "Sun-bleached stone seawalls and spice-laden docks dispatching lateen vessels across tropical straits and distant seas.",
        "playerServices": ["Sea Voyages", "Free Harbor Rest"],
    },
    "tr_port_map04_arctic_seaport": {
        "playerKind": "Sea-Trade Harbor",
        "playerRegion": "Frostbound Bay",
        "playerDescription": "Ice-broken harbor pilings lined with heavy iron lanterns guiding sturdy northern ships safely to warmer waters.",
        "playerServices": ["Sea Voyages", "Free Harbor Rest"],
    },
    "tr_ferry_crossing": {
        "playerKind": "Strait Ferry Landing",
        "playerDescription": "Weathered oak dock pilings where regional ferrymen carry travelers safely across narrow island sea straits.",
        "playerServices": ["Strait Ferry"],
    },
    "tr_ferry_crossing_inst_2": {
        "playerKind": "Strait Ferry Landing",
        "playerDescription": "Weathered oak dock pilings where regional ferrymen carry travelers safely across narrow island sea straits.",
        "playerServices": ["Strait Ferry"],
    },
    "tr_ferry_crossing_inst_3": {
        "playerKind": "Strait Ferry Landing",
        "playerDescription": "Weathered oak dock pilings where regional ferrymen carry travelers safely across narrow island sea straits.",
        "playerServices": ["Strait Ferry"],
    },
    "tr_ferry_crossing_inst_4": {
        "playerKind": "Strait Ferry Landing",
        "playerDescription": "Weathered oak dock pilings where regional ferrymen carry travelers safely across narrow island sea straits.",
        "playerServices": ["Strait Ferry"],
    },
    "tr_border_mountain_pass_gate": {
        "playerKind": "Mountain Pass Gatehouse",
        "playerDescription": "Heavy iron-bound timber doors set between high stone crags guarding the narrow highland crossing.",
        "playerServices": ["Highland Pass"],
    },
}
