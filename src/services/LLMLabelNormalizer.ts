const VALID_LABEL_IDS = [
  "individualism_vs_collectivism",
  "ideology",
  "authority",
  "change",
  "market_vs_gov",
  "competition_vs_equality",
  "speculation_vs_value",
  "micro_vs_macro",
  "real_vs_virtual",
  "capital_labor",
  "geopolitics",
  "radicalism",
  "establishment",
  "elite_vs_grassroots",
  "feminism_vs_patriarchy",
  "urban_vs_rural",
  "generational_conflict",
  "open_vs_closed",
  "innovation_vs_security",
  "optimism_vs_conservatism",
  "decentralization_vs_centralization",
  "local_vs_global",
  "spiritual_vs_material",
  "serious_vs_popular",
  "secular_vs_religious",
  "protection_vs_development",
  "climate_believer_vs_skeptic",
  "2d_vs_3d",
  "hardcore_vs_casual",
  "niche_vs_mainstream",
  "frugal_vs_luxury",
  "stable_vs_risk",
  "cat_vs_dog",
  "family_vs_single",
  "discipline_vs_hedonism",
  "work_vs_life",
  "conformity_vs_individuality",
  "acceleration_vs_caution",
  "privacy_vs_convenience",
];

const LABEL_VARIATIONS: Record<string, string> = {
  // Individualism vs Collectivism variations
  collectivism_vs_individualism: "individualism_vs_collectivism",
  individualism_collectivism: "individualism_vs_collectivism",
  collectivism_individualism: "individualism_vs_collectivism",
  individual_collective: "individualism_vs_collectivism",
  collectivist_individualist: "individualism_vs_collectivism",
  individualist_collectivist: "individualism_vs_collectivism",

  // Ideology variations
  left_right: "ideology",
  ideology_left_right: "ideology",
  left_vs_right: "ideology",
  right_vs_left: "ideology",
  leftist_rightist: "ideology",
  rightist_leftist: "ideology",

  // Authority/Liberty variations
  authority_freedom: "authority",
  freedom_authority: "authority",
  libertarian_authoritarian: "authority",
  authoritarian_libertarian: "authority",
  liberty_order: "authority",
  order_liberty: "authority",
  authoritarian_hierarchy: "authority",
  hierarchy_authoritarian: "authority",

  // Change/Tradition variations
  traditional_progressive: "change",
  progressive_traditional: "change",
  change_tradition: "change",
  tradition_change: "change",
  progressive_conservative: "change",
  conservative_progressive: "change",

  // Market vs Government variations
  market_government: "market_vs_gov",
  government_market: "market_vs_gov",
  market_state: "market_vs_gov",
  state_market: "market_vs_gov",
  free_market_gov: "market_vs_gov",
  gov_free_market: "market_vs_gov",

  // Elite vs Grassroots variations
  elite_grassroots: "elite_vs_grassroots",
  grassroots_elite: "elite_vs_grassroots",
  elite_people: "elite_vs_grassroots",
  people_elite: "elite_vs_grassroots",
  grassroot_elite: "elite_vs_grassroots",
  elite_grassroot: "elite_vs_grassroots",

  // Feminism vs Patriarchy variations
  feminism_patriarchy: "feminism_vs_patriarchy",
  patriarchy_feminism: "feminism_vs_patriarchy",
  gender_equality_tradition: "feminism_vs_patriarchy",
  tradition_gender_equality: "feminism_vs_patriarchy",
  feminist_patriarchal: "feminism_vs_patriarchy",
  patriarchal_feminist: "feminism_vs_patriarchy",

  // Urban vs Rural variations
  urban_rural: "urban_vs_rural",
  rural_urban: "urban_vs_rural",
  city_village: "urban_vs_rural",
  village_city: "urban_vs_rural",

  // Generational conflict variations
  generational_conflict_left_right: "generational_conflict",
  left_generational_conflict: "generational_conflict",
  right_generational_conflict: "generational_conflict",
  gen_z_boomer: "generational_conflict",
  boomer_gen_z: "generational_conflict",
  millennial_gen_x: "generational_conflict",
  gen_x_millennial: "generational_conflict",

  // Open vs Closed variations
  open_closed: "open_vs_closed",
  closed_open: "open_vs_closed",
  openness_closedness: "open_vs_closed",
  closedness_openness: "open_vs_closed",

  // Innovation vs Security variations
  innovation_security: "innovation_vs_security",
  security_innovation: "innovation_vs_security",
  innovative_secure: "innovation_vs_security",
  secure_innovative: "innovation_vs_security",

  // Tech optimism variations
  tech_optimism_pessimism: "optimism_vs_conservatism",
  optimism_pessimism_tech: "optimism_vs_conservatism",
  tech_pessimism_optimism: "optimism_vs_conservatism",
  optimism_conservatism: "optimism_vs_conservatism",
  technology_optimistic_pessimistic: "optimism_vs_conservatism",
  technological_optimistic_pessimistic: "optimism_vs_conservatism",

  // Decentralization variations
  decentralization_centralization: "decentralization_vs_centralization",
  centralization_decentralization: "decentralization_vs_centralization",
  decentralized_centralized: "decentralization_vs_centralization",
  centralized_decentralized: "decentralization_vs_centralization",

  // Local vs Global variations
  local_global: "local_vs_global",
  global_local: "local_vs_global",
  globalization_nationalism: "local_vs_global",
  nationalism_globalization: "local_vs_global",
  localization_globalization: "local_vs_global",
  globalization_localization: "local_vs_global",

  // Spiritual vs Material variations
  spiritual_material: "spiritual_vs_material",
  material_spiritual: "spiritual_vs_material",
  spiritual_vs_material: "spiritual_vs_material",
  material_vs_spiritual: "spiritual_vs_material",
  idealistic_materialistic: "spiritual_vs_material",
  materialistic_idealistic: "spiritual_vs_material",

  // Serious vs Popular variations
  serious_popular: "serious_vs_popular",
  popular_serious: "serious_vs_popular",
  high_brow_low_brow: "serious_vs_popular",
  low_brow_high_brow: "serious_vs_popular",

  // Secular vs Religious variations
  secular_religious: "secular_vs_religious",
  religious_secular: "secular_vs_religious",
  religion_secularism: "secular_vs_religious",
  secularism_religion: "secular_vs_religious",

  // Protection vs Development variations
  protection_development: "protection_vs_development",
  development_protection: "protection_vs_development",
  environmental_protection_economic_development: "protection_vs_development",
  economic_development_environmental_protection: "protection_vs_development",

  // Climate belief variations
  climate_believer_skeptic: "climate_believer_vs_skeptic",
  skeptic_believer_climate: "climate_believer_vs_skeptic",
  climate_change_believer_skeptic: "climate_believer_vs_skeptic",
  climate_change_skeptic_believer: "climate_believer_vs_skeptic",

  // 2D vs 3D variations
  "2d_3d": "2d_vs_3d",
  "3d_2d": "2d_vs_3d",
  two_dimensional_three_dimensional: "2d_vs_3d",
  three_dimensional_two_dimensional: "2d_vs_3d",

  // Hardcore vs Casual variations
  hardcore_casual: "hardcore_vs_casual",
  casual_hardcore: "hardcore_vs_casual",
  hardcore_gamer_casual_gamer: "hardcore_vs_casual",
  casual_gamer_hardcore_gamer: "hardcore_vs_casual",

  // Niche vs Mainstream variations
  niche_mainstream: "niche_vs_mainstream",
  mainstream_niche: "niche_vs_mainstream",
  underground_mainstream: "niche_vs_mainstream",
  mainstream_underground: "niche_vs_mainstream",

  // Frugal vs Luxury variations
  frugal_luxury: "frugal_vs_luxury",
  luxury_frugal: "frugal_vs_luxury",
  minimalist_luxurious: "frugal_vs_luxury",
  luxurious_minimalist: "frugal_vs_luxury",

  // Stable vs Risk variations
  stable_risk: "stable_vs_risk",
  risk_stable: "stable_vs_risk",
  stable_unstable: "stable_vs_risk",
  unstable_stable: "stable_vs_risk",

  // Cat vs Dog variations
  cat_dog: "cat_vs_dog",
  dog_cat: "cat_vs_dog",
  feline_canine: "cat_vs_dog",
  canine_feline: "cat_vs_dog",

  // Family vs Single variations
  family_single: "family_vs_single",
  single_family: "family_vs_single",
  married_single: "family_vs_single",
  single_married: "family_vs_single",

  // Discipline vs Hedonism variations
  discipline_hedonism: "discipline_vs_hedonism",
  hedonism_discipline: "discipline_vs_hedonism",
  self_discipline_pleasure: "discipline_vs_hedonism",
  pleasure_self_discipline: "discipline_vs_hedonism",

  // Competition vs Equality variations
  competition_equality: "competition_vs_equality",
  equality_competition: "competition_vs_equality",
  competitive_equalitarian: "competition_vs_equality",
  equalitarian_competitive: "competition_vs_equality",

  // Speculation vs Value variations
  speculation_value: "speculation_vs_value",
  value_speculation: "speculation_vs_value",
  speculative_valuable: "speculation_vs_value",
  valuable_speculative: "speculation_vs_value",

  // Micro vs Macro variations
  micro_macro: "micro_vs_macro",
  macro_micro: "micro_vs_macro",
  microscopic_macroscopic: "micro_vs_macro",
  macroscopic_microscopic: "micro_vs_macro",

  // Real vs Virtual variations
  real_virtual: "real_vs_virtual",
  virtual_real: "real_vs_virtual",
  physical_virtual: "real_vs_virtual",
  virtual_physical: "real_vs_virtual",

  // Capital vs Labor variations
  capital_labor: "capital_labor",
  labor_capital: "capital_labor",
  capital_vs_labor: "capital_labor",
  labor_vs_capital: "capital_labor",
  worker_owner: "capital_labor",
  owner_worker: "capital_labor",

  // Geopolitics variations
  globalism_nationalism: "geopolitics",
  nationalism_globalism: "geopolitics",
  internationalism_isolationism: "geopolitics",
  isolationism_internationalism: "geopolitics",
  cosmopolitan_nationalist: "geopolitics",
  nationalist_cosmopolitan: "geopolitics",

  // Radicalism variations
  radical_moderate: "radicalism",
  moderate_radical: "radicalism",
  extremist_moderate: "radicalism",
  moderate_extremist: "radicalism",

  // Establishment variations
  establishment_populist: "establishment",
  populist_establishment: "establishment",

  // Work vs Life variations
  work_life: "work_vs_life",
  life_work: "work_vs_life",
  worklife_balance: "work_vs_life",
  life_work_balance: "work_vs_life",

  // Conformity vs Individuality variations
  conformity_vs_individuality: "conformity_vs_individuality",
  individuality_vs_conformity: "conformity_vs_individuality",
  conformity_individuality: "conformity_vs_individuality",
  individuality_conformity: "conformity_vs_individuality",

  // Acceleration vs Caution variations
  acceleration_vs_caution: "acceleration_vs_caution",
  caution_vs_acceleration: "acceleration_vs_caution",
  acceleration_caution: "acceleration_vs_caution",
  caution_acceleration: "acceleration_vs_caution",

  // Privacy vs Convenience variations
  privacy_vs_convenience: "privacy_vs_convenience",
  convenience_vs_privacy: "privacy_vs_convenience",
  privacy_convenience: "privacy_vs_convenience",
  convenience_privacy: "privacy_vs_convenience",

  // Extra common typos
  idealogoy: "ideology",
  idelogy: "ideology",
  ideology: "ideology",
  market_gov: "market_vs_gov",
  "market.gov": "market_vs_gov",
  authroity: "authority",
  changge: "change",
  geopoltics: "geopolitics",
  radcalism: "radicalism",
  estabishment: "establishment",
  competion_vs_equality: "competition_vs_equality",
  specualtion_vs_value: "speculation_vs_value",
  compétition_vs_équality: "competition_vs_equality",
};

const isValidLabelId = (labelId: string): boolean =>
  VALID_LABEL_IDS.includes(labelId);

export const normalizeLabelId = (labelId: string): string => {
  const normalized = labelId
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[\-.]/g, "_")
    .replace(/_{2,}/g, "_");

  const result = LABEL_VARIATIONS[normalized] || normalized;

  if (!isValidLabelId(result)) {
    for (const [variation, standard] of Object.entries(LABEL_VARIATIONS)) {
      if (
        normalized.includes(variation) ||
        standard.includes(normalized.replace(/_/g, ""))
      ) {
        return standard;
      }
    }
  }

  return result;
};
