export interface TavernTrackInfo {
  relPath: string;
  chapterNum: number;
  chapterLabel: string;
  title: string;
  shortTitle: string;
  speaker: string;
  overview: string;
  worldHistory: string;
}

export const TAVERN_TRACK_CATALOG: Record<string, TavernTrackInfo> = {
  "assets/audio/music/taverns/chapter_01_the_gladiator_yearning.ogg": {
    relPath: "assets/audio/music/taverns/chapter_01_the_gladiator_yearning.ogg",
    chapterNum: 1,
    chapterLabel: "Chapter I",
    title: "The Gladiator (Yearning)",
    shortTitle: "Ballad I · The Gladiator's Yearning",
    speaker: "Arena Ballad",
    overview:
      "Under the merciless glare of Highcrown's coliseum sun, a battered gladiator drags himself across crimson sand after bringing down another rival condemned for the King's sport. Exhausted and choking on arena dust, his eyes lift toward the high royal balcony—where a quiet, sorrowful gaze waits far above his iron cage.",
    worldHistory:
      "Common folk across the Crownlands still remember how King Garrick filled the arena sands with blood while starving his own court of mercy—making every verse of this ballad ring with sympathy for those trapped beneath his rule.",
  },
  "assets/audio/music/taverns/chapter_02_the_queen_the_plan.ogg": {
    relPath: "assets/audio/music/taverns/chapter_02_the_queen_the_plan.ogg",
    chapterNum: 2,
    chapterLabel: "Chapter II",
    title: "The Queen (The Plan)",
    shortTitle: "Ballad II · The Queen's Plan",
    speaker: "High Tower Ballad",
    overview:
      "High in her cold stone gallery overlooking the empty, bloodstained arena below, Queen Ellowyn paces alone in heavy velvet—a weary captive bound by crown and duty to King Garrick's cold heart. When war horns summon the King out toward distant borders, a fleeting stillness settles over the keep for the first time in years.",
    worldHistory:
      "Crownlands singers tell how Garrick's cruelty and endless border wars pushed even his own quiet court toward desperate hope—leaving Highcrown's stone halls empty of warmth long before the kingdom fractured.",
  },
  "assets/audio/music/taverns/chapter_03_the_gladiator_the_affair.ogg": {
    relPath: "assets/audio/music/taverns/chapter_03_the_gladiator_the_affair.ogg",
    chapterNum: 3,
    chapterLabel: "Chapter III",
    title: "The Gladiator (The Affair)",
    shortTitle: "Ballad III · The Affair",
    speaker: "Midnight Aqueduct Ballad",
    overview:
      "Beneath a starlit sky while the fortress sleeps, a lone prisoner climbs upward through forgotten stone aqueducts where water long ceased to flow. Emerging out of the centuries-old ash and dust into midnight air, he steps toward the hushed, overgrown sanctuary gardens behind Highcrown's walls.",
    worldHistory:
      "To this day, travelers walking Highcrown's ruined gardens speak softly of the dark dry passages beneath the city—reminders of how human kindness once sought shelter far from King Garrick's harsh gaze.",
  },
  "assets/audio/music/taverns/chapter_04_the_queen_the_seduction.ogg": {
    relPath: "assets/audio/music/taverns/chapter_04_the_queen_the_seduction.ogg",
    chapterNum: 4,
    chapterLabel: "Chapter IV",
    title: "The Queen (The Seduction)",
    shortTitle: "Ballad IV · The Seduction",
    speaker: "Dawn Tower Ballad",
    overview:
      "Standing in graying dawn mist among the garden ruins as distant war horns signal the King's returning army, Queen Ellowyn faces an agonizing choice to shield the people she loves. Before iron boots thunder across the courtyard, she must step back into silk and silver inside a palace ruled by fear.",
    worldHistory:
      "Along Thornwall and Weald hearths, folk honor the quiet endurance it took to survive under Garrick's cold roof—remembering that calm court bearing often hid immense courage and sacrifice.",
  },
  "assets/audio/music/taverns/chapter_05_the_king_the_iron_heir.ogg": {
    relPath: "assets/audio/music/taverns/chapter_05_the_king_the_iron_heir.ogg",
    chapterNum: 5,
    chapterLabel: "Chapter V",
    title: "The King (The Iron Heir)",
    shortTitle: "Ballad V · The Iron Heir",
    speaker: "Iron Throne Ballad",
    overview:
      "Twelve grim winters into his unchallenged reign, King Garrick looks down from his stone tower onto a sunlit courtyard filled with wooden training blades. Convinced mercy makes rulers weak, the tyrant decides soft-spoken court captains can never harden the twelve-year-old boy expected to bear his wolf banner.",
    worldHistory:
      "Border garrisons still repeat Garrick's cold creed—that iron is only forged through fear—explaining why every stronghold he raised across Ethoria grew darker and harsher under his command.",
  },
  "assets/audio/music/taverns/chapter_06_the_prince_the_arrogant_pupil.ogg": {
    relPath: "assets/audio/music/taverns/chapter_06_the_prince_the_arrogant_pupil.ogg",
    chapterNum: 6,
    chapterLabel: "Chapter VI",
    title: "The Prince (The Arrogant Pupil)",
    shortTitle: "Ballad VI · The Arrogant Pupil",
    speaker: "Courtyard Ballad",
    overview:
      "Under a scorching midday sun on the gravel training yard, young Prince Valen crashes hard into the dust beneath his instructor's wooden practice sword. Bruised and fiercely proud inside a court where rank dictates everything, the boy refuses to break beneath a strict mentor who answers only to steel.",
    worldHistory:
      "Minstrels in the Weald sing this verse with compassion for a youth raised in Garrick's harsh shadow—taught from boyhood that strength meant never yielding, before hard years on the road reshaped his heart.",
  },
  "assets/audio/music/taverns/chapter_07_the_lead_commander_whispers_and_the_scar.ogg": {
    relPath: "assets/audio/music/taverns/chapter_07_the_lead_commander_whispers_and_the_scar.ogg",
    chapterNum: 7,
    chapterLabel: "Chapter VII",
    title: "The Lead Commander (Whispers & The Scar)",
    shortTitle: "Ballad VII · Whispers & the Scar",
    speaker: "Rampart Ballad",
    overview:
      "High atop the shadowed battlements, veteran Commander Orin keeps silent watch over the training yard as five more winters harden the young prince below into a cold, razor-sharp swordsman. Standing sentinel over stone walls soaked in palace whispers, Orin senses a storm gathering inside the fortress.",
    worldHistory:
      "Throughout southern watchtowers and highland camps, soldiers respect Orin's steady vigilance from the walls—the loyal veteran who watched shadows tighten around Highcrown long before the realm broke apart.",
  },
  "assets/audio/music/taverns/chapter_08_the_prince_the_humiliation.ogg": {
    relPath: "assets/audio/music/taverns/chapter_08_the_prince_the_humiliation.ogg",
    chapterNum: 8,
    chapterLabel: "Chapter VIII",
    title: "The Prince (The Humiliation)",
    shortTitle: "Ballad VIII · The Humiliation",
    speaker: "Coliseum Gate Ballad",
    overview:
      "Standing silent before his father's iron throne as King Garrick delivers cold orders for the celebratory coliseum games, an older scarred Prince Valen bows his head in obedience. Beneath gleaming plate armor and crimson banners, years of pride and resentment stir quietly as arena trumpets begin to blow.",
    worldHistory:
      "Merchants across the southern harbors recall how unspoken bitterness inside Highcrown's throne room finally spilled onto sunlit cobblestones—marking the day royal pageantry turned to grief.",
  },
  "assets/audio/music/taverns/chapter_09_the_gladiator_the_sacrifice.ogg": {
    relPath: "assets/audio/music/taverns/chapter_09_the_gladiator_the_sacrifice.ogg",
    chapterNum: 9,
    chapterLabel: "Chapter IX",
    title: "The Gladiator (The Sacrifice)",
    shortTitle: "Ballad IX · The Sacrifice",
    speaker: "Arena Sands Ballad",
    overview:
      "Standing alone upon bloodstained coliseum dust awaiting the decree of freedom he earned across long years of servitude, an aging veteran lifts his eyes toward the royal box. Beneath glaring midday sun and roaring stands, he prepares for what should be his final hour inside the pit.",
    worldHistory:
      "Even rough harbor sailors go quiet when these opening strings sound—honoring a warrior who endured years under Garrick's chain and still met his darkest hour with unbroken honor.",
  },
  "assets/audio/music/taverns/chapter_10_the_prince_the_awakening.ogg": {
    relPath: "assets/audio/music/taverns/chapter_10_the_prince_the_awakening.ogg",
    chapterNum: 10,
    chapterLabel: "Chapter X",
    title: "The Prince (The Awakening)",
    shortTitle: "Ballad X · The Awakening",
    speaker: "Reckoning Ballad",
    overview:
      "Stepping onto blinding coliseum sands beneath hot noon light as heavy iron gates slam shut behind him, Prince Valen draws polished steel before the watching realm. Believing victory in the pit will erase old court scars, he marches forward into a clash that will haunt his memory forever.",
    worldHistory:
      "Beside northern winter hearths, listeners hear this verse with heavy silence—remembering the afternoon Highcrown's proud illusion shattered and forced a humbled prince onto a path of atonement.",
  },
  "assets/audio/music/taverns/chapter_11_the_king_the_wrath_of_the_crown.ogg": {
    relPath: "assets/audio/music/taverns/chapter_11_the_king_the_wrath_of_the_crown.ogg",
    chapterNum: 11,
    chapterLabel: "Chapter XI",
    title: "The King (The Wrath of the Crown)",
    shortTitle: "Ballad XI · Wrath of the Crown",
    speaker: "Final Dusk Ballad",
    overview:
      "Dead, frozen silence hangs like winter ice over Highcrown's crowded arena as King Garrick stares rigidly down from his high seat. Watching truth unravel across the yellow sand below, the tyrant's cold wrath rises like dark stormclouds over court and sand alike.",
    worldHistory:
      "Here the old ballads stop just before your journey begins: soon after that bitter afternoon, Garrick abandoned the divided capital to raise dark legions in the north—unleashing the Portals that heroes now stand together to seal.",
  },
};

export function getTavernTrackInfo(relPath: string | null | undefined): TavernTrackInfo | null {
  if (!relPath) return null;
  return TAVERN_TRACK_CATALOG[relPath] ?? null;
}
