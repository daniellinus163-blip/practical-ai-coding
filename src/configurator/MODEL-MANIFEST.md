# FormShift 3D model manifest

Owner-supplied GLBs live in `3d car models/` and are copied to `public/models/` for the browser:

| Catalog vehicle | Source file | Public URL |
|---|---|---|
| Tesla Model 3 | `tesla_2018_model_3.glb` | `/models/tesla-model-3/tesla_2018_model_3.glb` |
| Tesla Roadster | `tesla_roadster_2020.glb` | `/models/tesla-roadster/tesla_roadster_2020.glb` |
| Bugatti Chiron | `free_bugatti_chiron.glb` | `/models/bugatti-chiron/free_bugatti_chiron.glb` |
| Lamborghini Revuelto | `2024_lamborghini_revuelto.glb` | `/models/lamborghini-revuelto/2024_lamborghini_revuelto.glb` |

Also present: `porsche_911_gt3.glb`, `mclaren_senna_free.glb` (homepage extras), and `2018_ferrari_sp38_deborah.zip` (zipped — not loaded until unzipped to GLB).

## Drop paths

| Vehicle | Status in catalog | File to add | Official OEM model? |
|---|---|---|---|
| Tesla Model 3 | Production | `public/models/tesla-model-3/vehicle.glb` | No, unless you obtain authorised files |
| Tesla Roadster | Upcoming / planned | `public/models/tesla-roadster/vehicle.glb` | **No** — do not claim a production-ready official model |
| Bugatti Chiron | Production ended | `public/models/bugatti-chiron/vehicle.glb` | No, unless authorised |
| Lamborghini Revuelto | Production | `public/models/lamborghini-revuelto/vehicle.glb` | No, unless authorised |

After dropping a file, refresh the vehicle page. The studio inspects meshes and materials. Customization stays **off** until `src/configurator/manifest.ts` lists the real material or mesh names for that feature.

Do not commit files whose licence forbids redistribution. A file in `public/` is fetchable at a public URL.

## Sources checked (28 Oct 2026)

- [Sketchfab](https://sketchfab.com/) — [licence agreement](https://sketchfab.com/licenses). Standard licence is not a blank cheque to host the raw GLB.
- [CGTrader](https://www.cgtrader.com/3d-models) — [Royalty Free](https://help.cgtrader.com/hc/en-us/articles/360015124437-Royalty-Free-License) is usually paid or “free download” with no redistribution of the file. Editorial = non-commercial. **Ask before purchasing.**
- [Poly Pizza](https://poly.pizza/explore) — no Tesla Model 3 / Roadster / Chiron / Revuelto. Generic CC0 cars must not be labelled as those vehicles.

Candidate links (verify the live licence yourself):

- Model 3 Sketchfab “FREE TO USE”: https://sketchfab.com/3d-models/tesla-model-3-free-to-use-91cc094d0d80402480445d70f3a53580
- Model 3 CGTrader RF listing: https://www.cgtrader.com/free-3d-models/car/antique-car/tesla-car-model-3
- Roadster Sketchfab: https://sketchfab.com/3d-models/tesla-roadster-7320a1317342401aaa3f8134d9563f09
- Chiron Sketchfab (ALIEEEN): https://sketchfab.com/3d-models/free-bugatti-chiron-374890e62c5a44e9a739ca638b6e0a18
- Revuelto Sketchfab (ALIEEEN): https://sketchfab.com/3d-models/free-lamborghini-revuelto-cf52245eb68f48daa909c7ad2a8deaa3

Do not scrape manufacturer configurators.

## Supported customization (current)

Until assets are supplied and inspected: **none** (paint, wheels, calipers, interior, trim all disabled with reasons in the studio UI).
