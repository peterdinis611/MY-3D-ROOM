import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

window.addEventListener('error', (e) => {
  const h = document.getElementById('hint');
  if (h) h.textContent = 'Chyba: ' + (e.error?.message || e.message);
  console.error(e.error || e);
});
window.addEventListener('unhandledrejection', (e) => {
  const h = document.getElementById('hint');
  if (h) h.textContent = 'Chyba: ' + (e.reason?.message || e.reason);
  console.error(e.reason);
});

import _01_helpers_js from './chunks/01-helpers.js.js';
import _02_time_of_day_presets_shared_by_both_scenes_js from './chunks/02-time-of-day-presets-shared-by-both-scenes.js.js';
import _03_renderer_outer_scene_js from './chunks/03-renderer-outer-scene.js.js';
import _04_vyhlad_za_oknom_canvas_textura_podla_casu_dna_js from './chunks/04-vyhlad-za-oknom-canvas-textura-podla-casu-dna.js.js';
import _05_buildroom_floor_walls_window_js from './chunks/05-buildroom-floor-walls-window.js.js';
import _06_builddesk_desk_riser_mat_pouch_cables_js from './chunks/06-builddesk-desk-riser-mat-pouch-cables.js.js';
import _07_papier_na_stole_zapis_localstorage_js from './chunks/07-papier-na-stole-zapis-localstorage.js.js';
import _08_stolicka_sedenie_vstavanie_js from './chunks/08-stolicka-sedenie-vstavanie.js.js';
import _09_kos_pod_stol_zahodenie_listkov_viko_js from './chunks/09-kos-pod-stol-zahodenie-listkov-viko.js.js';
import _10_pocasie_za_oknom_dazd_sneh_js from './chunks/10-pocasie-za-oknom-dazd-sneh.js.js';
import _11_buildscreens_aoc_nested_scene_dell_github_js from './chunks/11-buildscreens-aoc-nested-scene-dell-github.js.js';
import _12_buildlaptop_vs_code_screen_js from './chunks/12-buildlaptop-vs-code-screen.js.js';
import _13_buildmugs_owl_mug_white_cup_steam_pen_mouse_js from './chunks/13-buildmugs-owl-mug-white-cup-steam-pen-mouse.js.js';
import _14_buildwalldecor_cork_board_medals_js from './chunks/14-buildwalldecor-cork-board-medals.js.js';
import _15_buildtechcorner_router_power_strip_chargers_cabl_js from './chunks/15-buildtechcorner-router-power-strip-chargers-cabl.js.js';
import _16_kable_kotvy_na_portoch_rady_po_stole_a_riseri_js from './chunks/16-kable-kotvy-na-portoch-rady-po-stole-a-riseri.js.js';
import _17_buildclock_nastenne_hodiny_ukazuju_skutocny_cas_js from './chunks/17-buildclock-nastenne-hodiny-ukazuju-skutocny-cas.js.js';
import _18_buildlights_ceiling_pendant_desk_lamp_light_dark_js from './chunks/18-buildlights-ceiling-pendant-desk-lamp-light-dark.js.js';
import _19_nested_scene_aperture_and_air_js from './chunks/19-nested-scene-aperture-and-air.js.js';
import _20_hud_canvas_drawn_overlaid_on_the_nested_view_js from './chunks/20-hud-canvas-drawn-overlaid-on-the-nested-view.js.js';
import _21_settimeofday_smoothly_lerped_each_frame_js from './chunks/21-settimeofday-smoothly-lerped-each-frame.js.js';
import _22_zvuky_vsetko_generovane_v_kode_web_audio_js from './chunks/22-zvuky-vsetko-generovane-v-kode-web-audio.js.js';
import _23_interaction_js from './chunks/23-interaction.js.js';
import _24_build_loop_js from './chunks/24-build-loop.js.js';

const __sources = [_01_helpers_js, _02_time_of_day_presets_shared_by_both_scenes_js, _03_renderer_outer_scene_js, _04_vyhlad_za_oknom_canvas_textura_podla_casu_dna_js, _05_buildroom_floor_walls_window_js, _06_builddesk_desk_riser_mat_pouch_cables_js, _07_papier_na_stole_zapis_localstorage_js, _08_stolicka_sedenie_vstavanie_js, _09_kos_pod_stol_zahodenie_listkov_viko_js, _10_pocasie_za_oknom_dazd_sneh_js, _11_buildscreens_aoc_nested_scene_dell_github_js, _12_buildlaptop_vs_code_screen_js, _13_buildmugs_owl_mug_white_cup_steam_pen_mouse_js, _14_buildwalldecor_cork_board_medals_js, _15_buildtechcorner_router_power_strip_chargers_cabl_js, _16_kable_kotvy_na_portoch_rady_po_stole_a_riseri_js, _17_buildclock_nastenne_hodiny_ukazuju_skutocny_cas_js, _18_buildlights_ceiling_pendant_desk_lamp_light_dark_js, _19_nested_scene_aperture_and_air_js, _20_hud_canvas_drawn_overlaid_on_the_nested_view_js, _21_settimeofday_smoothly_lerped_each_frame_js, _22_zvuky_vsetko_generovane_v_kode_web_audio_js, _23_interaction_js, _24_build_loop_js];
const __code = __sources.join('\n\n');
const __run = new Function('THREE', 'OrbitControls', __code);
__run(THREE, OrbitControls);
