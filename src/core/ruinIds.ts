export const RUIN_IDS=[
  'citizens_home','scottish_smiths_superstore','once_inhabited_cave','old_hydraulic_pump','old_bicycle_hire_shop','deserted_freight_yard','old_field_hospital','old_aerodrome','old_police_station','nuclear_bunker','macs_atomic_cafe','motorway_services','wrecked_cars','shattered_illusions_bar','home_depot','construction_site_shelter','fraser_ds_kebab_ish','dukes_villa','dark_woods','collapsed_mineshaft','collapsed_quarry','strange_circular_device','pi_keya_furniture','family_tomb','fast_food_restaurant','plane_crash_site','garden_shed','looted_supermarket','cave','indian_burial_ground','fairground_stall','small_house','water_processing_plant','cosmetics_lab','ambulance','warehouse','disused_car_park','broken_down_tank','motel_666_dusk','army_outpost','post_office','smugglers_cache','equipped_trench','town_library','mini_market','mayor_mobile','wrecked_transporter','burnt_school','dilapidated_building','derelict_villa','abandoned_construction_site','abandoned_well','disused_silos','blocked_road','abandoned_park','guns_n_zombies_armoury','disused_warehouse','citizens_tent','destroyed_pharmacy','shady_bar','abandoned_bunker','abandoned_hotel','abandoned_hospital','crows_fit_gym','strange_barn',
] as const

export type RuinId=typeof RUIN_IDS[number]
export type ExplorableRuinFamily='bunker'|'hotel'|'hospital'

export const EXPLORABLE_RUIN_IDS:readonly RuinId[]=['abandoned_bunker','abandoned_hotel','abandoned_hospital']

export const LEGACY_SPECIAL_SITE_TO_RUIN:Readonly<Record<string,RuinId>>={
  construction_site:'construction_site_shelter',
  wrecked_cars:'wrecked_cars',
  pharmacy:'old_field_hospital',
  supermarket:'scottish_smiths_superstore',
  dark_woods:'dark_woods',
  police_station:'old_police_station',
}
