import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { format } from 'date-fns'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: '#f8fafc', card: '#ffffff', panel: '#1e293b',
  text: '#0f172a', sub: '#475569', dim: '#64748b',
  border: '#e2e8f0', borderMd: '#cbd5e1',
  amber: '#f59e0b', amberBg: 'rgba(245,158,11,0.10)', amberBd: 'rgba(245,158,11,0.30)',
  green: '#16a34a', greenBg: '#dcfce7',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.10)',
  blue: '#2563eb', blueBg: '#dbeafe',
}

// ── Weekly meal plan — exported for Dashboard + Calendar ─────────────────────
// Keyed by JS day-of-week (0=Sun … 6=Sat)
export const WEEK_MEAL_PLAN = {
  1: { emoji: '🥞', title: 'Bún Xèo (Vietnamese Sizzling Crepes)', mealId: 12 },
  2: { emoji: '🌮', title: 'Carne Asada Tacos', mealId: 13 },
  3: { emoji: '🍝', title: 'Marry Me Chicken Pasta', mealId: 14 },
  4: { emoji: '🍗', title: 'Chicken Tikka Masala + Rice', mealId: 15 },
  5: { emoji: '🎉', title: 'Eating Out!', mealId: null, eatOut: true },
}
export function getTodaysMeal() { return WEEK_MEAL_PLAN[new Date().getDay()] || null }

// ── Meals data ────────────────────────────────────────────────────────────────
const MEALS = [
  // ── Week of Jun 23 (archived) ─────────────────────────────────────────────
  {
    id: 0, day: 'Monday', date: 'June 23', emoji: '🍋', bg: '#fef9ee', weekTag: 'Week of Jun 23',
    title: 'Lemon Herb Chicken + Roasted Potatoes',
    desc: 'Juicy chicken breast with lemon herb pan sauce over crispy potato wedges',
    ingredients: [
      { name: 'Chicken breasts', qty: '2 (1–1.5 lbs)' }, { name: 'Russet potatoes', qty: '2 large' },
      { name: 'Lemons', qty: '2' }, { name: 'Garlic cloves', qty: '3, minced' },
      { name: 'Butter', qty: '1 tbsp' }, { name: 'Olive oil', qty: '4 tbsp total' },
      { name: 'Dried oregano', qty: '1 tsp' }, { name: 'Chicken broth', qty: '¼ cup' },
      { name: 'Garlic powder', qty: 'pinch' }, { name: 'Salt & pepper', qty: 'generous' },
    ],
    steps: [
      { title: 'Pull chicken from fridge', type: 'prep', stove: null, min: null, warn: null,
        items: ['Pull both chicken breasts out — set on plate', 'Room temp chicken cooks more evenly', 'Do this 30 min before you start cooking'], tip: null },
      { title: 'Cut potatoes into wedges', type: 'prep', stove: null, min: null, warn: null,
        items: ['Wash both russet potatoes', 'Cut into equal-size wedges', 'Pat dry with paper towels — dry = crispier', 'Toss in 2 tbsp olive oil, salt, pepper, garlic powder, oregano'], tip: '💡 Equal size pieces cook at the same rate.' },
      { title: 'Prep the chicken', type: 'prep', stove: null, min: null, warn: null,
        items: ['Pat both breasts dry with paper towels', 'Season: salt, pepper, garlic powder, 1 tsp oregano', 'Mince 3 garlic cloves — set aside', 'Juice 1 lemon into a small bowl'], tip: null },
      { title: 'Wash board & knife', type: 'wash', stove: null, min: null, warn: 'Raw chicken — wash now',
        items: ['Wash cutting board and knife with hot soapy water', 'Wash your hands'], tip: null },
      { title: 'Start the potatoes', type: 'cook', stove: 'Med (middle of dial)', min: 20, warn: null,
        items: ['Heat large pan to Med, add 1 tbsp olive oil', "Add potato wedges cut-side down — don't crowd", 'Cook 8–10 min without touching', 'Flip — cook another 8–10 min until golden'], tip: "💡 Don't touch them while crisping." },
      { title: 'Sear the chicken', type: 'cook', stove: 'Med–6', min: 12, warn: null,
        items: ['Heat to Med–6, add 1 tbsp olive oil + 1 tbsp butter', 'Lay both breasts down — good sizzle = good sign', 'Cook 5–6 min first side without touching', 'Flip — cook 5–6 more min. No pink = done'], tip: null },
      { title: 'Make lemon herb pan sauce', type: 'cook', stove: '4', min: 4, warn: null,
        items: ['Remove chicken to rest plate — do NOT wipe the pan', 'Add minced garlic — stir 30 sec', 'Pour in ¼ cup chicken broth — scrape up the brown bits', 'Squeeze in juice of 1 lemon, simmer 2–3 min'], tip: '💡 Those brown bits are pure flavor.' },
      { title: 'Rest chicken & plate', type: 'cook', stove: null, min: 5, warn: null,
        items: ['Chicken rests 5 full min — do not cut yet', 'Plate potatoes, lay chicken alongside', 'Spoon lemon herb sauce over chicken'], tip: '💡 5 min rest = all juices stay inside.' },
    ],
  },
  {
    id: 1, day: 'Tuesday', date: 'June 24', emoji: '🐟', bg: '#eff6ff', weekTag: 'Week of Jun 23',
    title: 'Pan Seared Tilapia + Garlic Butter Rice',
    desc: 'Crispy tilapia fillets seared in lemon butter over fluffy garlic rice',
    ingredients: [
      { name: 'Tilapia fillets', qty: '1 lb' }, { name: 'White rice', qty: '1 cup dry' },
      { name: 'Butter', qty: '2 tbsp' }, { name: 'Lemons', qty: '2' },
      { name: 'Garlic cloves', qty: '3, minced' }, { name: 'Olive oil', qty: '1 tbsp' },
      { name: 'Paprika', qty: '½ tsp' }, { name: 'Salt & pepper', qty: 'generous' },
    ],
    steps: [
      { title: 'Start the rice', type: 'cook', stove: 'High → Lo', min: 18, warn: null,
        items: ['Rinse 1 cup rice until water clears', 'Add to pot: rice + 2 cups water + pinch of salt + 1 tsp minced garlic', 'Boil on High, then Lo covered 16–18 min', 'Turn off, let sit 5 min covered'], tip: null },
      { title: 'Prep the tilapia', type: 'prep', stove: null, min: null, warn: null,
        items: ['Pat fillets completely dry — critical for a good sear', 'Season both sides: salt, pepper, paprika', 'Mince remaining garlic — set aside', 'Juice 1 lemon into a bowl'], tip: '💡 Dry fish = crispy sear. Wet fish = steamed.' },
      { title: 'Sear & flip', type: 'cook', stove: 'Med–6', min: 7, warn: 'Hot oil — careful',
        items: ['Heat pan to Med–6, add 1 tbsp olive oil', 'Lay fillets gently — should sizzle loud', 'Cook 3–4 min without moving until golden', 'Flip, drop to Med, cook 2–3 more min until it flakes'], tip: "💡 Fish releases naturally when the crust forms." },
      { title: 'Lemon butter sauce & plate', type: 'cook', stove: '4', min: 3, warn: null,
        items: ['Remove fish, drop to 4', 'Add 2 tbsp butter + garlic, stir 30 sec', 'Squeeze in lemon, let bubble 1 min', 'Pour over fish, plate with garlic rice'], tip: null },
    ],
  },
  {
    id: 2, day: 'Wednesday', date: 'June 25', emoji: '🐟', bg: '#f0f9ff', weekTag: 'Week of Jun 23',
    title: 'Honey Garlic Salmon + Rice',
    desc: 'Glazed salmon in honey garlic sauce over fluffy white rice',
    ingredients: [
      { name: 'Salmon fillets', qty: '1 lb' }, { name: 'Honey', qty: '3 tbsp' },
      { name: 'Soy sauce', qty: '2 tbsp' }, { name: 'Garlic cloves', qty: '3, minced' },
      { name: 'White rice', qty: '1 cup dry' }, { name: 'Butter', qty: '1 tbsp' },
      { name: 'Olive oil', qty: '1 tbsp' }, { name: 'Green onions', qty: 'garnish' },
      { name: 'Salt & pepper', qty: 'to taste' },
    ],
    steps: [
      { title: 'Make honey garlic sauce', type: 'prep', stove: null, min: null, warn: null,
        items: ['Mix: 3 tbsp honey + 2 tbsp soy sauce + 3 minced garlic cloves', 'Stir until combined — set aside'], tip: null },
      { title: 'Start the rice', type: 'cook', stove: 'High → Lo', min: 18, warn: null,
        items: ['Rinse 1 cup rice', 'Boil with 2 cups water + salt on High', 'Drop to Lo, cover 16–18 min, then 5 min off'], tip: null },
      { title: 'Sear the salmon', type: 'cook', stove: 'Med–6', min: 4, warn: null,
        items: ['Pat dry, season with salt + pepper', 'Heat pan to Med–6, add 1 tbsp olive oil', 'Sear skin-side up 3–4 min without touching'], tip: null },
      { title: 'Flip & glaze', type: 'cook', stove: 'Med', min: 4, warn: null,
        items: ['Flip to skin-side down, drop to Med', 'Pour honey garlic sauce over top + add 1 tbsp butter', 'Baste every 30 sec for 3–4 min until glazed'], tip: '💡 Keep basting for maximum glaze.' },
      { title: 'Plate & serve', type: 'cook', stove: null, min: null, warn: null,
        items: ['Rice into 2 bowls', 'Salmon on top, drizzle remaining sauce', 'Top with sliced green onions'], tip: null },
    ],
  },
  {
    id: 3, day: 'Thursday', date: 'June 26', emoji: '🌮', bg: '#fdf4ff', weekTag: 'Week of Jun 23',
    title: 'Chicken Fajitas',
    desc: 'Sizzling chicken with peppers and onions in warm flour tortillas',
    ingredients: [
      { name: 'Chicken breasts', qty: '1 lb, sliced thin' }, { name: 'Bell peppers', qty: '2, sliced' },
      { name: 'Yellow onion', qty: '1, sliced' }, { name: 'Flour tortillas', qty: 'large pack' },
      { name: 'Avocado', qty: '1' }, { name: 'Lime', qty: '1' },
      { name: 'Cumin', qty: '1 tsp' }, { name: 'Chili powder', qty: '1 tsp' },
      { name: 'Paprika', qty: '½ tsp' }, { name: 'Garlic powder', qty: '½ tsp' },
      { name: 'Olive oil', qty: '2 tbsp' }, { name: 'Salt & pepper', qty: 'generous' },
    ],
    steps: [
      { title: 'Slice & season chicken', type: 'prep', stove: null, min: null, warn: null,
        items: ['Slice chicken into thin strips', 'Mix spices: cumin, chili powder, paprika, garlic powder, salt, pepper', 'Toss chicken in spice mix + 1 tbsp olive oil'], tip: null },
      { title: 'Wash board & knife', type: 'wash', stove: null, min: null, warn: 'Raw chicken',
        items: ['Wash board and knife, wipe counter, wash hands'], tip: null },
      { title: 'Cook chicken', type: 'cook', stove: '6–8', min: 8, warn: null,
        items: ['Heat pan to 6–8, add 1 tbsp olive oil', "Chicken in single layer — don't crowd", 'Cook 3–4 min each side. Remove when done'], tip: '💡 High heat = restaurant-style sear.' },
      { title: 'Cook peppers & onions', type: 'cook', stove: 'Med–6', min: 7, warn: null,
        items: ['Same pan, drop to Med–6', 'Add peppers and onions, cook 6–7 min with some char', 'Squeeze ½ lime over veggies', 'Add chicken back in — toss 1 min'], tip: null },
      { title: 'Warm tortillas & build', type: 'cook', stove: 'Lo–2', min: 2, warn: null,
        items: ['Warm tortillas in dry pan 30 sec each side', 'Slice avocado, squeeze remaining lime', 'Build your own tacos!'], tip: null },
    ],
  },
  {
    id: 4, day: 'Friday', date: 'June 27', emoji: '🎉', bg: '#f8fafc', eatOut: true, weekTag: 'Week of Jun 23',
    title: 'Eating Out — Date Night!',
    desc: 'Friday night — you and the wife eat out. Enjoy!',
    ingredients: [], steps: [],
  },
  {
    id: 5, day: 'Saturday', date: 'June 28', emoji: '🌮', bg: '#f0fdf4', weekTag: 'Week of Jun 23',
    title: 'Shrimp Tacos + Mango Slaw',
    desc: 'Seasoned shrimp in warm tortillas topped with fresh mango slaw',
    ingredients: [
      { name: 'Shrimp, peeled & deveined', qty: '1 lb' }, { name: 'Mango', qty: '2, diced small' },
      { name: 'Coleslaw mix 10oz', qty: '1 bag' }, { name: 'Flour tortillas', qty: 'large pack' },
      { name: 'Avocado', qty: '1' }, { name: 'Limes', qty: '2' },
      { name: 'Cilantro', qty: 'handful' }, { name: 'Chili powder', qty: '1 tsp' },
      { name: 'Cumin', qty: '½ tsp' }, { name: 'Olive oil', qty: '1 tbsp' },
    ],
    steps: [
      { title: 'Make mango slaw', type: 'prep', stove: null, min: null, warn: null,
        items: ['Dice 2 mangos into small cubes', 'Mix: coleslaw bag + mango + cilantro + juice of 1 lime + pinch of salt', 'Set in fridge'], tip: '💡 Slaw gets better as it sits.' },
      { title: 'Season shrimp', type: 'prep', stove: null, min: null, warn: null,
        items: ['Pat shrimp dry', 'Toss with: chili powder, cumin, salt, pepper, 1 tbsp olive oil'], tip: null },
      { title: 'Cook shrimp', type: 'cook', stove: '6–8', min: 5, warn: null,
        items: ['Heat pan to 6–8 — shrimp need high heat', 'Single layer, cook 1.5–2 min each side', 'Pull when pink and curled into a C shape'], tip: '💡 The second they curl into a C, pull them off.' },
      { title: 'Warm tortillas & build', type: 'cook', stove: 'Lo–2', min: 2, warn: null,
        items: ['Warm tortillas 30 sec each side', 'Build: tortilla → shrimp → mango slaw → avocado → squeeze of lime'], tip: null },
    ],
  },
  {
    id: 6, day: 'Sunday', date: 'June 29', emoji: '🥩', bg: '#fff1f2', weekTag: 'Week of Jun 23',
    title: 'Beef Stir Fry + White Rice',
    desc: 'Tender beef with broccoli and peppers in savory stir fry sauce',
    ingredients: [
      { name: 'Beef sirloin, thin sliced', qty: '1 lb' }, { name: 'Broccoli florets 10.8oz', qty: '1 bag' },
      { name: 'Bell pepper', qty: '1, sliced' }, { name: 'White rice', qty: '1 cup dry' },
      { name: 'Soy sauce', qty: '3 tbsp' }, { name: 'Honey', qty: '1 tbsp' },
      { name: 'Garlic cloves', qty: '3, minced' }, { name: 'Fresh ginger', qty: '1 tsp grated' },
      { name: 'Cornstarch', qty: '1 tbsp' }, { name: 'Vegetable oil', qty: '2 tbsp' },
    ],
    steps: [
      { title: 'Make stir fry sauce', type: 'prep', stove: null, min: null, warn: null,
        items: ['Mix: 3 tbsp soy sauce + 1 tbsp honey + 1 tbsp cornstarch + 2 tbsp water', 'Stir until cornstarch dissolves — set next to stove'], tip: "💡 Have this ready before you start — stir fry moves fast." },
      { title: 'Prep beef & veggies', type: 'prep', stove: null, min: null, warn: null,
        items: ['Pat beef dry, season with salt + pepper', 'Mince garlic + grate ginger, combine', 'Slice bell pepper into strips'], tip: null },
      { title: 'Start the rice', type: 'cook', stove: 'High → Lo', min: 18, warn: null,
        items: ['Rinse rice, boil with 2 cups water', 'Drop to Lo, cover 16–18 min, then 5 min off'], tip: null },
      { title: 'Sear the beef', type: 'cook', stove: 'High', min: 4, warn: 'Very hot — careful',
        items: ['Pan to High — screaming hot', 'Add 1 tbsp oil, beef in single layer (batches if needed)', 'Sear 1–2 min per side, pull to plate'], tip: '💡 High heat = tender beef. Slow = tough.' },
      { title: 'Cook veggies + sauce', type: 'cook', stove: '6–8', min: 6, warn: null,
        items: ['Drop to 6–8, add 1 tbsp oil', 'Stir fry broccoli + pepper 3–4 min', 'Add garlic + ginger — 30 sec', 'Add beef back, pour sauce, toss until coats and thickens (1–2 min)'], tip: '💡 Cornstarch activates on heat — sauce gets glossy.' },
      { title: 'Plate & serve', type: 'cook', stove: null, min: null, warn: null,
        items: ['Rice in bowls, stir fry over top', 'Top with sliced green onions'], tip: null },
    ],
  },
  // ── Week of Jun 29 ────────────────────────────────────────────────────────────
  {
    id: 7, day: 'Monday', date: 'June 30', emoji: '🍣', bg: '#f0f9ff', weekTag: 'Week of Jun 30',
    title: 'Salmon Poke Bowl',
    desc: 'Seared well-done salmon over white rice with fresh poke toppings and sesame marinade',
    ingredients: [
      { name: 'Salmon fillet', qty: '1 lb' },
      { name: 'White rice', qty: '1 cup dry' },
      { name: 'Avocado', qty: '1, sliced' },
      { name: 'Cucumber', qty: '1, thinly sliced' },
      { name: 'Edamame (frozen)', qty: '½ bag' },
      { name: 'Green onions', qty: '2 stalks, chopped' },
      { name: 'Soy sauce', qty: '3 tbsp' },
      { name: 'Sesame oil', qty: '1 tbsp' },
      { name: 'Rice vinegar', qty: '1 tbsp' },
      { name: 'Sriracha or spicy mayo', qty: 'to taste' },
      { name: 'Sesame seeds', qty: 'garnish' },
      { name: 'Lime', qty: '1, juiced' },
    ],
    steps: [
      { title: 'Start the rice', type: 'cook', stove: 'High → Lo', min: 18, warn: null,
        items: ['Rinse 1 cup rice until water clears', 'Add to pot: 2 cups water + pinch of salt', 'Bring to boil on High, then cover and drop to Lo', 'Cook 16–18 min, then turn off — keep covered 5 min'], tip: null },
      { title: 'Make poke marinade', type: 'prep', stove: null, min: null, warn: null,
        items: ['In a small bowl mix: 3 tbsp soy sauce + 1 tbsp sesame oil + 1 tbsp rice vinegar + juice of 1 lime', 'Stir to combine — set aside'], tip: '💡 This is the flavor base for the whole bowl.' },
      { title: 'Prep the toppings', type: 'prep', stove: null, min: null, warn: null,
        items: ['Slice avocado into thin strips', 'Thinly slice cucumber into rounds', 'Chop green onions', 'Set all toppings in small bowls ready to go'], tip: null },
      { title: 'Warm the edamame', type: 'cook', stove: 'Med', min: 3, warn: null,
        items: ['Add frozen edamame to small pot with ½ cup water', 'Heat to Med, cook 3 min until warmed through', 'Drain and set aside'], tip: null },
      { title: 'Sear the salmon well done', type: 'cook', stove: '6–8', min: 10, warn: 'Hot oil — careful',
        items: ['Pat salmon dry with paper towels', 'Season with salt and pepper', 'Heat pan to 6–8, add 1 tbsp sesame oil', 'Sear skin-side down 4–5 min without moving', 'Flip — cook 4–5 more min. No pink anywhere = done', 'Remove and let rest 2 min, then slice or break into chunks'], tip: '💡 Well done salmon is fully opaque all the way through — no translucent pink center.' },
      { title: 'Build the bowls', type: 'prep', stove: null, min: null, warn: null,
        items: ['Start with a base of white rice in each bowl', 'Add salmon chunks on top', 'Arrange avocado, cucumber, edamame around the bowl', 'Drizzle poke marinade over everything', 'Top with green onions, sesame seeds, and sriracha or spicy mayo to taste'], tip: '💡 Make it colorful — a well-built poke bowl is half the experience.' },
    ],
  },
  {
    id: 8, day: 'Tuesday', date: 'July 1', emoji: '🌮', bg: '#fff7ed', weekTag: 'Week of Jun 30',
    title: 'Birria Tacos',
    desc: 'Slow-braised beef in chile broth, dipped and crisped in pan with melted cheese',
    ingredients: [
      { name: 'Beef chuck roast', qty: '2 lbs' },
      { name: 'Dried guajillo chiles', qty: '1 bag' },
      { name: 'Dried ancho chiles', qty: '1 bag' },
      { name: 'Beef broth', qty: '1 carton' },
      { name: 'White onion', qty: '1, quartered' },
      { name: 'Roma tomatoes', qty: '3' },
      { name: 'Garlic', qty: '1 head, cloves peeled' },
      { name: 'Cumin', qty: '1 tsp' },
      { name: 'Oregano', qty: '1 tsp' },
      { name: 'Smoked paprika', qty: '1 tsp' },
      { name: 'Corn tortillas', qty: '1 pack' },
      { name: 'Mozzarella or Oaxaca cheese', qty: '1 bag, shredded' },
      { name: 'Limes', qty: '2' },
      { name: 'Green onions', qty: 'for garnish' },
    ],
    steps: [
      { title: 'Toast & soak the chiles', type: 'cook', stove: 'Med', min: 5, warn: null,
        items: ['Remove stems and seeds from guajillo and ancho chiles', 'Heat dry pan to Med, toast chiles 30 sec each side until fragrant — do not burn', 'Transfer to a bowl, cover with hot water, soak 15–20 min until softened'], tip: '💡 Toasting activates the smoky flavor. Burned = bitter — watch them carefully.' },
      { title: 'Blend the chile sauce', type: 'prep', stove: null, min: null, warn: null,
        items: ['Drain soaked chiles', 'In a blender: chiles + 3 roma tomatoes + quartered onion + all garlic cloves + 1 cup beef broth', 'Add cumin, oregano, smoked paprika', 'Blend until completely smooth'], tip: null },
      { title: 'Season & sear the beef', type: 'cook', stove: '6–8', min: 8, warn: 'Hot oil — careful',
        items: ['Season beef chuck roast generously with salt and pepper on all sides', 'Heat large pot to 6–8, add 1 tbsp oil', 'Sear beef 3–4 min per side until browned — this builds flavor', 'Set beef aside on a plate'], tip: "💡 Don't skip the sear — it gives the broth a deep, rich flavor." },
      { title: 'Braise the beef low and slow', type: 'cook', stove: 'Lo', min: 150, warn: null,
        items: ['Pour chile sauce over the beef in the pot', 'Add remaining beef broth until beef is mostly submerged', 'Bring to a simmer on Med, then drop to Lo', 'Cover and cook 2.5–3 hours — beef should fall apart when poked with a fork', 'Check every 45 min and stir — add a splash of broth if too thick'], tip: '💡 Low and slow is everything here. High heat = tough beef.' },
      { title: 'Shred the beef', type: 'prep', stove: null, min: null, warn: null,
        items: ['Remove beef from broth to a cutting board', 'Use two forks to shred — it should pull apart easily', "Return shredded beef to the consomé broth", "The broth is the consomé — you'll dip tortillas in it"], tip: null },
      { title: 'Dip & cook the tacos', type: 'cook', stove: '6–8', min: 8, warn: 'Hot oil — careful',
        items: ['Heat a clean pan to 6–8 with a thin coat of oil', 'Using tongs, dip a corn tortilla in the consomé to coat both sides', 'Lay flat in hot pan, add cheese on one half, add birria beef on top', 'Fold tortilla over, press lightly', 'Cook 2–3 min per side until crispy and cheese melted'], tip: "💡 The consomé-dipped tortilla gets crispy and flavorful — that's the birria magic." },
      { title: 'Serve with consomé', type: 'prep', stove: null, min: null, warn: null,
        items: ['Ladle hot consomé into small bowls for dipping', 'Plate the tacos, garnish with green onions', 'Serve with lime wedges — squeeze into consomé before dipping'], tip: null },
    ],
  },
  {
    id: 9, day: 'Wednesday', date: 'July 2', emoji: '🍗', bg: '#fef9ee', weekTag: 'Week of Jun 30',
    title: 'Teriyaki Chicken + Rice',
    desc: 'Glazed chicken breast cooked well done over savory chicken broth rice',
    ingredients: [
      { name: 'Chicken breasts', qty: '1.5 lbs' },
      { name: 'Teriyaki sauce', qty: '1 bottle' },
      { name: 'White rice', qty: '1 cup dry' },
      { name: 'Chicken broth', qty: '½ cup (cook rice in broth + water)' },
      { name: 'Garlic', qty: '3 cloves, minced' },
      { name: 'Fresh ginger', qty: '½ tsp, grated' },
      { name: 'Butter', qty: '1 tbsp' },
      { name: 'Sesame seeds', qty: 'garnish' },
      { name: 'Green onions', qty: 'garnish' },
    ],
    steps: [
      { title: 'Marinate the chicken', type: 'prep', stove: null, min: 15, warn: null,
        items: ['Place chicken breasts in a dish or zip-lock bag', 'Pour ¼ cup teriyaki sauce over chicken to coat', 'Add minced garlic and grated ginger', 'Let marinate 15 min minimum (up to 1 hour in fridge)'], tip: '💡 Even 15 min makes a real flavor difference.' },
      { title: 'Cook rice in chicken broth', type: 'cook', stove: 'High → Lo', min: 18, warn: null,
        items: ['Rinse 1 cup rice until water clears', 'Combine: 1.5 cups water + ½ cup chicken broth in pot', 'Add rinsed rice, bring to boil on High', 'Drop to Lo, cover and cook 16–18 min', 'Turn off — keep covered 5 min before fluffing'], tip: '💡 Chicken broth gives the rice a savory depth instead of plain water.' },
      { title: 'Cook chicken well done', type: 'cook', stove: '6–8', min: 14, warn: null,
        items: ['Remove chicken from marinade — shake off excess', 'Heat pan to 6–8, add 1 tbsp butter', 'Lay chicken breasts flat — strong sizzle = good sign', 'Cook 6–7 min first side without moving', 'Flip — cook 6–7 more min. Firm to touch = done. No pink inside — ever.'], tip: '💡 Press test: soft = not done, firm = done. Always cook well done — no pink.' },
      { title: 'Glaze with teriyaki', type: 'cook', stove: 'Med', min: 3, warn: null,
        items: ['Drop heat to Med', 'Pour 2–3 tbsp fresh teriyaki sauce over the chicken', 'Flip chicken and coat both sides — let it bubble and caramelize 1–2 min each side', 'Remove from heat'], tip: '💡 Fresh glaze at the end gives a glossy restaurant-style finish.' },
      { title: 'Rest, slice & plate', type: 'prep', stove: null, min: 5, warn: null,
        items: ['Let chicken rest 5 min — do not cut yet', 'Fluff rice with a fork', 'Slice chicken on a bias into strips', 'Plate rice, lay sliced chicken on top', 'Drizzle any remaining pan glaze over chicken', 'Garnish with sesame seeds and green onions'], tip: '💡 Resting keeps all the juices inside. Cut too soon and they run out.' },
    ],
  },
  {
    id: 10, day: 'Thursday', date: 'July 3', emoji: '🍳', bg: '#fff7ed', weekTag: 'Week of Jun 30',
    title: 'Chicken Fried Rice',
    desc: 'Classic fried rice with well-done chicken, scrambled eggs, carrots, and sesame soy on high heat',
    ingredients: [
      { name: 'Chicken breasts', qty: '1.5 lbs, diced small' },
      { name: 'White rice', qty: '2 cups cooked (day-old preferred)' },
      { name: 'Eggs', qty: '3' },
      { name: 'Carrots', qty: '2, diced small' },
      { name: 'Green onions', qty: '2 stalks, chopped' },
      { name: 'Soy sauce', qty: '3 tbsp' },
      { name: 'Sesame oil', qty: '1 tbsp' },
      { name: 'Garlic', qty: '3 cloves, minced' },
      { name: 'Fresh ginger', qty: '½ tsp, grated' },
      { name: 'Butter', qty: '1 tbsp' },
    ],
    steps: [
      { title: 'Prep or use day-old rice', type: 'cook', stove: 'High → Lo', min: 18, warn: null,
        items: ['If using fresh rice: rinse 1 cup rice, boil with 2 cups water on High', 'Drop to Lo, cover 16–18 min, then 5 min off', 'Spread cooked rice on a sheet pan to cool and dry — cold/dry rice fries better', 'Day-old fridge rice works best — use 2 cups if you have it'], tip: '💡 Wet hot rice steams instead of frying. Cool and dry it out first.' },
      { title: 'Cook the chicken well done', type: 'cook', stove: '6–8', min: 10, warn: null,
        items: ['Dice chicken into small ½-inch cubes', 'Season with salt and pepper', 'Heat pan to 6–8, add ½ tbsp butter', 'Cook in single layer — do not crowd', 'Cook 4–5 min, toss, cook 4–5 more min. No pink = done', 'Remove to plate — set aside'], tip: null },
      { title: 'Scramble the eggs separately', type: 'cook', stove: 'Med', min: 3, warn: null,
        items: ['Beat 3 eggs with a pinch of salt', 'Lower heat to Med, add tiny pat of butter', 'Pour eggs in — scramble gently until just barely set (slightly soft)', 'Remove immediately — they finish cooking in the final toss'], tip: '💡 Slightly undercooked eggs now = perfect texture later when mixed into the hot rice.' },
      { title: 'Stir fry carrots & aromatics', type: 'cook', stove: 'High', min: 4, warn: 'Very hot pan — move fast',
        items: ['Crank heat to High', 'Add ½ tbsp butter, add diced carrots', 'Stir fry 2 min until slightly softened', 'Add minced garlic + grated ginger — stir 30 sec until fragrant'], tip: '💡 High heat = that smoky wok flavor. Do not lower the heat.' },
      { title: 'Fry the rice', type: 'cook', stove: 'High', min: 4, warn: null,
        items: ['Add cooled rice to the hot pan', 'Press and break up any clumps with a spatula', 'Let sit 1 min to get slightly crispy on bottom, then toss', 'Drizzle 3 tbsp soy sauce + 1 tbsp sesame oil over the rice', 'Toss everything until rice is evenly coated and golden'], tip: null },
      { title: 'Combine everything & serve', type: 'cook', stove: 'High', min: 2, warn: null,
        items: ['Add cooked chicken back into the pan', 'Fold in scrambled eggs — break into pieces as you toss', 'Add chopped green onions', 'Toss everything on High 1–2 min until combined and piping hot', 'Taste and adjust — add more soy sauce or sesame oil as needed', 'Plate and serve immediately'], tip: '💡 Taste at the end — every soy sauce brand is different in saltiness.' },
    ],
  },
  {
    id: 11, day: 'Friday', date: 'July 4', emoji: '🎉', bg: '#f8fafc', eatOut: true, weekTag: 'Week of Jun 30',
    title: 'Eating Out — Jul 4th!',
    desc: 'Happy 4th of July — no cooking tonight. Go enjoy the holiday!',
    ingredients: [], steps: [],
  },
  // ── Week of Jul 7 ─────────────────────────────────────────────────────────────
  {
    id: 12, day: 'Monday', date: 'July 7', emoji: '🥞', bg: '#fefce8',
    title: 'Bún Xèo (Vietnamese Sizzling Crepes)',
    desc: 'Crispy turmeric rice crepes filled with shrimp and bean sprouts, wrapped in lettuce and dipped in nuoc cham',
    ingredients: [
      { name: 'Shrimp, peeled & deveined', qty: '½ lb' },
      { name: 'Rice flour', qty: '1 cup' },
      { name: 'Coconut milk', qty: '¾ cup' },
      { name: 'Turmeric', qty: '½ tsp' },
      { name: 'Bean sprouts', qty: '1 bag' },
      { name: 'Green onions', qty: '2 stalks, chopped' },
      { name: 'Mint or basil', qty: 'handful, leaves picked' },
      { name: 'Cilantro', qty: 'handful' },
      { name: 'Garlic', qty: '3 cloves, minced' },
      { name: 'Fish sauce', qty: '3 tbsp' },
      { name: 'Lime', qty: '1' },
      { name: 'Vegetable oil', qty: 'for frying' },
      { name: 'Sugar', qty: '1 tbsp' },
      { name: 'Salt & pepper', qty: 'pinch' },
    ],
    steps: [
      { title: 'Make the crepe batter', type: 'prep', stove: null, min: 20, warn: null,
        items: ['In a bowl whisk: 1 cup rice flour + ¾ cup coconut milk + ¾ cup water', 'Add ½ tsp turmeric + pinch of salt + chopped green onions', 'Whisk until completely smooth — should be thin, like heavy cream', 'Let batter rest 20 min at room temp'], tip: '💡 Resting the batter lets the flour hydrate — crispier crepe.' },
      { title: 'Season the shrimp', type: 'prep', stove: null, min: null, warn: null,
        items: ['Pat shrimp dry with paper towels', 'Toss with a pinch of salt, pepper, and 1 minced garlic clove'], tip: null },
      { title: 'Wash board & knife', type: 'wash', stove: null, min: null, warn: 'Raw shrimp — wash now',
        items: ['Wash cutting board and knife with hot soapy water', 'Wash your hands'], tip: null },
      { title: 'Sear the shrimp', type: 'cook', stove: 'Med–6', min: 4, warn: null,
        items: ['Heat pan to Med–6, add 1 tsp vegetable oil', 'Add shrimp in single layer, cook 1.5–2 min per side until pink and curled', 'Remove to a plate — set aside'], tip: '💡 Pull shrimp the second they curl into a C — carryover heat finishes them.' },
      { title: 'Make the nuoc cham dipping sauce', type: 'prep', stove: null, min: null, warn: null,
        items: ['Mix: 2 tbsp fish sauce + juice of 1 lime + 1 tbsp sugar + 3 tbsp water', 'Stir in remaining minced garlic', 'Stir until sugar dissolves — taste and adjust sweet/sour/salty'], tip: null },
      { title: 'Fry the first crepe', type: 'cook', stove: 'High', min: 6, warn: 'Hot oil — careful',
        items: ['Heat a nonstick pan to High, add 1 tbsp vegetable oil, swirl to coat', 'Pour in a thin layer of batter, swirl pan to spread it like a crepe', 'Scatter shrimp + a handful of bean sprouts over one half', 'Cover and cook 3–4 min until the edges look dry and lacy', 'Uncover — cook 1–2 more min until the bottom is crispy and golden'], tip: '💡 Dry, papery edges mean it’s crisped, not soggy.' },
      { title: 'Fold, plate & repeat', type: 'prep', stove: null, min: null, warn: null,
        items: ['Fold the crepe in half over the filling like an omelet', 'Slide onto a plate — repeat with remaining batter, shrimp, and bean sprouts', 'Serve with lettuce leaves, mint, cilantro, and nuoc cham for dipping'], tip: '💡 Tear off pieces, wrap in lettuce with herbs, and dip in nuoc cham — that’s the real way to eat it.' },
    ],
  },
  {
    id: 13, day: 'Tuesday', date: 'July 8', emoji: '🌮', bg: '#fef2f2',
    title: 'Carne Asada Tacos',
    desc: 'Lime-garlic marinated grilled steak, sliced thin and piled onto warm corn tortillas with fresh pico',
    ingredients: [
      { name: 'Flank or skirt steak', qty: '1.5 lbs' },
      { name: 'Limes', qty: '3, juiced' },
      { name: 'White onion', qty: '1' },
      { name: 'Garlic', qty: '4 cloves, minced' },
      { name: 'Cilantro', qty: '½ bunch, chopped' },
      { name: 'Jalapeño', qty: '1, minced' },
      { name: 'Corn tortillas', qty: '1 pack' },
      { name: 'Cumin', qty: '1 tsp' },
      { name: 'Olive oil', qty: '3 tbsp' },
      { name: 'Salt & pepper', qty: 'generous' },
    ],
    steps: [
      { title: 'Marinate the steak', type: 'prep', stove: null, min: 30, warn: null,
        items: ['In a bowl or zip-lock bag mix: 3 tbsp olive oil + juice of 2 limes + 2 minced garlic cloves + 1 tsp cumin + salt + pepper', 'Add ¼ of the onion, minced, to the marinade', 'Add steak, coat completely', 'Marinate at least 30 min (up to overnight in the fridge)'], tip: '💡 The lime juice tenderizes the steak the longer it sits.' },
      { title: 'Wash hands & prep area', type: 'wash', stove: null, min: null, warn: 'Raw beef — wash now',
        items: ['Wash cutting board, knife, and any bowls that touched raw steak', 'Wash your hands'], tip: null },
      { title: 'Make the pico de gallo', type: 'prep', stove: null, min: null, warn: null,
        items: ['Dice the remaining ¾ of the white onion', 'Chop cilantro, mince the jalapeño', 'Mix onion + cilantro + jalapeño + juice of 1 lime + pinch of salt', 'Set in the fridge to chill while the steak cooks'], tip: null },
      { title: 'Sear the steak', type: 'cook', stove: 'High', min: 8, warn: 'Very hot — careful',
        items: ['Remove steak from marinade, pat lightly, discard marinade', 'Heat pan to High with remaining garlic', 'Sear steak 3–4 min per side for medium — adjust to your liking', 'Remove to a cutting board'], tip: '💡 A hard sear on high heat gives that charred, restaurant-style crust.' },
      { title: 'Rest & slice', type: 'prep', stove: null, min: 5, warn: null,
        items: ['Let steak rest 5 min — do not cut yet', 'Slice thinly against the grain'], tip: '💡 Cutting against the grain is what keeps carne asada tender.' },
      { title: 'Warm tortillas & build', type: 'cook', stove: 'Lo–2', min: 2, warn: null,
        items: ['Warm corn tortillas in a dry pan 20–30 sec each side', 'Build: tortilla → sliced steak → pico de gallo → extra cilantro', 'Serve with lime wedges'], tip: null },
    ],
  },
  {
    id: 14, day: 'Wednesday', date: 'July 9', emoji: '🍝', bg: '#fff1f2',
    title: 'Marry Me Chicken Pasta',
    desc: 'Seared chicken and pasta in a creamy sun-dried tomato parmesan sauce with thyme and a little heat',
    ingredients: [
      { name: 'Chicken breasts', qty: '1.5 lbs' },
      { name: 'Heavy cream', qty: '1 cup' },
      { name: 'Parmesan, shredded', qty: '1 cup' },
      { name: 'Sun dried tomatoes', qty: '½ cup, chopped' },
      { name: 'Chicken broth', qty: '½ cup' },
      { name: 'Garlic', qty: '3 cloves, minced' },
      { name: 'Dried thyme', qty: '1 tsp' },
      { name: 'Red pepper flakes', qty: '½ tsp' },
      { name: 'Penne or fettuccine', qty: '1 lb' },
      { name: 'Butter', qty: '1 tbsp' },
      { name: 'Olive oil', qty: '2 tbsp' },
      { name: 'Salt & pepper', qty: 'generous' },
    ],
    steps: [
      { title: 'Cook the pasta', type: 'cook', stove: 'High', min: 10, warn: null,
        items: ['Bring a large pot of salted water to a boil', 'Cook penne or fettuccine to al dente per package instructions', 'Reserve ½ cup pasta water before draining', 'Drain and set aside'], tip: '💡 That starchy pasta water helps the sauce cling later.' },
      { title: 'Season & sear the chicken', type: 'cook', stove: 'Med–6', min: 12, warn: null,
        items: ['Pat chicken dry, season generously with salt and pepper', 'Heat pan to Med–6, add olive oil + butter', 'Sear chicken 6 min per side until golden and cooked through (no pink)', 'Remove to a cutting board, slice once rested'], tip: null },
      { title: 'Wash board & knife', type: 'wash', stove: null, min: null, warn: 'Raw chicken — wash now',
        items: ['Wash cutting board and knife with hot soapy water', 'Wash your hands'], tip: null },
      { title: 'Build the sauce', type: 'cook', stove: 'Med', min: 6, warn: null,
        items: ['Same pan, drop to Med, add minced garlic + red pepper flakes — stir 30 sec', 'Add chopped sun-dried tomatoes', 'Pour in chicken broth, scrape up the browned bits', 'Stir in heavy cream + dried thyme, simmer 3–4 min'], tip: '💡 Those browned bits from searing the chicken are the base of the flavor.' },
      { title: 'Finish the sauce', type: 'cook', stove: 'Lo', min: 3, warn: null,
        items: ['Drop heat to Lo', 'Stir in parmesan a handful at a time until melted and glossy', 'If too thick, splash in reserved pasta water until silky'], tip: null },
      { title: 'Combine & plate', type: 'prep', stove: null, min: null, warn: null,
        items: ['Toss the drained pasta into the sauce until fully coated', 'Plate, top with sliced chicken', 'Garnish with extra parmesan and a pinch of red pepper flakes'], tip: null },
    ],
  },
  {
    id: 15, day: 'Thursday', date: 'July 10', emoji: '🍗', bg: '#fff7ed',
    title: 'Chicken Tikka Masala + Rice',
    desc: 'Garam masala marinated chicken simmered in a creamy coconut tomato curry, served over rice',
    ingredients: [
      { name: 'Chicken breasts', qty: '½ lb, diced' },
      { name: 'Crushed tomatoes', qty: '1 can' },
      { name: 'Coconut milk', qty: '¾ cup (remaining from can)' },
      { name: 'Garam masala', qty: '2 tbsp' },
      { name: 'Turmeric', qty: '½ tsp' },
      { name: 'Garlic', qty: '3 cloves, minced' },
      { name: 'Garlic powder', qty: '½ tsp' },
      { name: 'White rice', qty: '1 cup dry' },
      { name: 'Butter', qty: '1 tbsp' },
      { name: 'Olive oil', qty: '1 tbsp' },
      { name: 'Salt & pepper', qty: 'generous' },
    ],
    steps: [
      { title: 'Marinate the chicken', type: 'prep', stove: null, min: 15, warn: null,
        items: ['Dice chicken into bite-size cubes', 'Toss with 1 tbsp garam masala + turmeric + garlic powder + salt + pepper + drizzle of olive oil', 'Marinate at least 15 min'], tip: null },
      { title: 'Start the rice', type: 'cook', stove: 'High → Lo', min: 18, warn: null,
        items: ['Rinse 1 cup rice until water clears', 'Add to pot: rice + 2 cups water + pinch of salt', 'Bring to a boil on High, then cover and drop to Lo', 'Cook 16–18 min, then turn off — keep covered 5 min'], tip: null },
      { title: 'Wash board & knife', type: 'wash', stove: null, min: null, warn: 'Raw chicken — wash now',
        items: ['Wash cutting board and knife with hot soapy water', 'Wash your hands'], tip: null },
      { title: 'Sear the chicken', type: 'cook', stove: '6–8', min: 8, warn: null,
        items: ['Heat pan to 6–8, add butter + remaining olive oil', 'Add chicken in a single layer, cook 4 min', 'Toss, cook 4 more min until browned and no pink remains', 'Remove to a plate — set aside'], tip: null },
      { title: 'Build the sauce', type: 'cook', stove: 'Med', min: 10, warn: null,
        items: ['Same pan, drop to Med, add minced garlic — stir 30 sec', 'Add crushed tomatoes + remaining garam masala', 'Stir in coconut milk', 'Simmer 8–10 min, stirring occasionally, until thickened and deep orange'], tip: '💡 Let it simmer uncovered so the sauce reduces and deepens in color.' },
      { title: 'Combine & simmer', type: 'cook', stove: 'Lo', min: 5, warn: null,
        items: ['Return chicken and any resting juices to the sauce', 'Simmer on Lo 5 min to finish cooking through and soak up flavor', 'Taste and adjust salt'], tip: null },
      { title: 'Plate & serve', type: 'prep', stove: null, min: null, warn: null,
        items: ['Fluff rice with a fork', 'Rice into bowls, ladle tikka masala over the top'], tip: null },
    ],
  },
  {
    id: 16, day: 'Friday', date: 'July 11', emoji: '🎉', bg: '#f8fafc', eatOut: true,
    title: 'Eating Out!',
    desc: 'Friday night — you and the wife eat out. Enjoy!',
    ingredients: [], steps: [],
  },
]
const WEEK_MEALS = MEALS.filter(m => !m.weekTag)
const RECIPE_MEALS = WEEK_MEALS.filter(m => !m.eatOut)
const ALL_RECIPE_MEALS = MEALS.filter(m => !m.eatOut)

// ── Grocery sections ──────────────────────────────────────────────────────────
const DEFAULT_GROCERY_SECTIONS = [
  { title: '🥩 Meat', items: [
    { name: 'Flank steak or skirt steak', detail: '1.5 lbs — Carne Asada', price: '$9.00' },
    { name: 'Chicken breasts', detail: '2 lbs — Marry Me Chicken + Tikka', price: '$7.00' },
  ]},
  { title: '🥬 Produce', items: [
    { name: 'Limes', detail: '4 — Carne Asada + Bún Xèo', price: '$1.50' },
    { name: 'White onion', detail: '1 — Carne Asada', price: '$0.75' },
    { name: 'Garlic', detail: '1 head — multiple dishes', price: '$0.75' },
    { name: 'Cilantro', detail: '1 bunch — Carne Asada + Bún Xèo', price: '$1.00' },
    { name: 'Bean sprouts', detail: '1 bag — Bún Xèo', price: '$1.50' },
    { name: 'Green onions', detail: '1 bunch — Bún Xèo', price: '$1.00' },
    { name: 'Mint or basil', detail: '1 bunch — Bún Xèo', price: '$1.50' },
    { name: 'Jalapeño', detail: '2 — Carne Asada', price: '$0.50' },
  ]},
  { title: '🧀 Dairy', items: [
    { name: 'Heavy cream', detail: '1 cup — Marry Me Chicken', price: '$2.50' },
    { name: 'Parmesan shredded', detail: '1 bag — Marry Me Chicken', price: '$4.00' },
  ]},
  { title: '🥫 Canned & Pantry', items: [
    { name: 'Crushed tomatoes', detail: '1 can — Tikka', price: '$1.50' },
    { name: 'Coconut milk', detail: '1 can — Tikka', price: '$2.00' },
    { name: 'Sun dried tomatoes', detail: '1 jar — Marry Me Chicken', price: '$4.00' },
    { name: 'Chicken broth', detail: '1 carton — Marry Me Chicken + Tikka', price: '$2.50' },
    { name: 'Fish sauce', detail: 'small bottle — Bún Xèo', price: '$3.00' },
    { name: 'Rice flour', detail: 'small bag — Bún Xèo', price: '$2.50' },
    { name: 'Corn tortillas', detail: '1 pack — Carne Asada', price: '$2.00' },
    { name: 'Turmeric', detail: 'small jar — Bún Xèo', price: '$2.00' },
  ]},
  { title: '🧂 Spices', items: [
    { name: 'Garlic powder', detail: '', price: '$1.50' },
    { name: 'Garam masala', detail: 'Tikka', price: '$2.50' },
    { name: 'Dried thyme', detail: 'Marry Me Chicken', price: '$2.00' },
    { name: 'Red pepper flakes', detail: 'Marry Me Chicken', price: '$2.00' },
  ]},
  { title: '🍚 Dry Goods', items: [
    { name: 'Penne or fettuccine', detail: '1 lb — Marry Me Chicken', price: '$2.00' },
    { name: 'Shrimp', detail: '½ lb — Bún Xèo filling', price: '$5.00' },
  ]},
]

// ── Grocery budget ────────────────────────────────────────────────────────────
const GROCERY_BUDGET = 71
const GROCERY_MIN    = 67
const GROCERY_MAX    = 75

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s) { const m = Math.floor(s/60), se = s%60; return `${m}:${se<10?'0':''}${se}` }
function getCurrentMonday() {
  const d = new Date(), day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d); mon.setDate(d.getDate() + diff); mon.setHours(0,0,0,0)
  return mon.toISOString().slice(0,10)
}
function deepClone(s) { return s.map(sec => ({ ...sec, items: sec.items.map(i => ({ ...i })) })) }
function parsePrice(p) { const v = parseFloat((p||'').replace('$','')); return isNaN(v) ? 0 : v }

const STORAGE_KEY = 'ck-dashboard-v4'
function loadState() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null } }
function saveState(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {} }
function loadImages() { try { const r = localStorage.getItem('ck-images'); return r ? JSON.parse(r) : {} } catch { return {} } }
function saveImages(imgs) { try { localStorage.setItem('ck-images', JSON.stringify(imgs)) } catch {} }
function loadRatings() { try { const r = localStorage.getItem('ck-ratings'); return r ? JSON.parse(r) : {} } catch { return {} } }
function saveRatings(rs) { try { localStorage.setItem('ck-ratings', JSON.stringify(rs)) } catch {} }

function initTimers() {
  const ts = {}
  MEALS.forEach(m => m.steps.forEach((step, i) => {
    if (step.min) ts[`${m.id}-${i}`] = { remaining: step.min*60, running: false, started: false }
  }))
  return ts
}

function fireConfetti() {
  const run = () => {
    if (!window.confetti) return
    window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#f59e0b','#16a34a','#2563eb','#ef4444','#8b5cf6'] })
    window.confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } })
    window.confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } })
  }
  if (window.confetti) { run(); return }
  const s = document.createElement('script')
  s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js'
  s.onload = run
  document.head.appendChild(s)
}

// ── CelebrationModal ──────────────────────────────────────────────────────────
function CelebrationModal({ meal, onClose }) {
  const [difficulty, setDifficulty] = useState(3)
  const [taste, setTaste] = useState(3)
  const [timeTaken, setTimeTaken] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const tasteEmojis = ['😕','😐','🙂','😋','🤤']
  const handleSave = () => {
    const rs = loadRatings()
    rs[`${meal.id}-${format(new Date(),'yyyy-MM-dd')}`] = { difficulty, taste, timeTaken: parseInt(timeTaken)||null, notes, cookedAt: new Date().toISOString() }
    saveRatings(rs); setSaved(true); setTimeout(onClose, 800)
  }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:600, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)' }} />
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        style={{ position:'relative', background:'white', borderRadius:20, width:'min(480px,94vw)', padding:'2rem', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🎉</div>
          <div style={{ fontSize:22, fontWeight:700, color:C.text }}>You did it! Dinner is served!</div>
          <div style={{ fontSize:13, color:C.dim, marginTop:4 }}>Time to plate up and enjoy!</div>
          <div style={{ fontSize:13, fontWeight:600, color:C.amber, marginTop:6 }}>{meal.title}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.dim, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Difficulty</div>
            <div style={{ display:'flex', gap:6 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setDifficulty(n)}
                  style={{ flex:1, padding:'8px 0', borderRadius:8, border:`1.5px solid ${n<=difficulty?C.amber:C.border}`, background:n<=difficulty?C.amberBg:'white', cursor:'pointer', fontSize:13 }}>
                  {'⭐'.repeat(n)}
                </button>
              ))}
            </div>
            <div style={{ fontSize:11, color:C.dim, marginTop:4, textAlign:'center' }}>{['','Very Easy','Easy','Medium','Hard','Very Hard'][difficulty]}</div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.dim, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Taste</div>
            <div style={{ display:'flex', gap:6 }}>
              {tasteEmojis.map((em, i) => (
                <button key={i} onClick={() => setTaste(i+1)}
                  style={{ flex:1, padding:'8px 0', borderRadius:8, border:`1.5px solid ${i+1===taste?C.green:C.border}`, background:i+1===taste?C.greenBg:'white', cursor:'pointer', fontSize:20 }}>
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.dim, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>Time Taken</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="number" min="5" max="180" placeholder="30" value={timeTaken} onChange={e => setTimeTaken(e.target.value)}
                style={{ padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, width:80, outline:'none' }} />
              <span style={{ fontSize:13, color:C.dim }}>minutes</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.dim, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>Notes for Next Time</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What would you do differently? What was amazing?"
              style={{ padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, width:'100%', minHeight:70, resize:'vertical', outline:'none', fontFamily:'inherit', color:C.text, boxSizing:'border-box' }} />
          </div>
        </div>
        <button onClick={handleSave}
          style={{ width:'100%', marginTop:20, padding:'12px 0', borderRadius:10, border:'none', background:saved?C.green:C.panel, color:'white', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          {saved ? '✓ Saved!' : 'Save & Close'}
        </button>
      </motion.div>
    </div>
  )
}

// ── Image zone ────────────────────────────────────────────────────────────────
function ImageZone({ meal, images, onSave, size = 'card' }) {
  const ref = useRef(null)
  const existing = images[meal.id]
  const h = size === 'modal' ? 140 : 100
  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 600, maxH = 400
        let w = img.width, h = img.height
        if (w > maxW) { h = Math.round(h*maxW/w); w = maxW }
        if (h > maxH) { w = Math.round(w*maxH/h); h = maxH }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        onSave(meal.id, canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file); e.target.value = ''
  }
  return (
    <div onClick={(e) => { e.stopPropagation(); ref.current?.click() }}
      style={{ position:'relative', height:h, background:existing?'transparent':meal.bg, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden' }}>
      {existing ? (
        <>
          <img src={existing} alt={meal.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity='1'} onMouseLeave={e => e.currentTarget.style.opacity='0'}>
            <div style={{ background:'rgba(0,0,0,0.55)', color:'white', fontSize:12, fontWeight:600, padding:'6px 12px', borderRadius:8 }}>📷 Replace photo</div>
          </div>
        </>
      ) : (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize: size==='modal'?48:36 }}>{meal.emoji}</div>
          <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>tap to add photo</div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Cooking() {
  const store = useStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [mealDone, setMealDone] = useState(new Set())
  const [mealIngChecked, setMealIngChecked] = useState({})
  const [stepDone, setStepDone] = useState({})
  const [grocerySections, setGrocerySections] = useState(() => deepClone(DEFAULT_GROCERY_SECTIONS))
  const [groceryActualPrices, setGroceryActualPrices] = useState({})
  const [groceryChecked, setGroceryChecked] = useState(new Set())
  const [groceryLogged, setGroceryLogged] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [modalMeal, setModalMeal] = useState(null)
  const [modalTab, setModalTab] = useState('steps')
  const [timerStates, setTimerStates] = useState(initTimers)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingActual, setEditingActual] = useState(null) // { sIdx, iIdx }
  const [editActualVal, setEditActualVal] = useState('')
  const [newItem, setNewItem] = useState({ name:'', detail:'', price:'', section:0 })
  const [initialized, setInitialized] = useState(false)
  const [celebration, setCelebration] = useState(null) // mealId
  const [images, setImages] = useState(() => loadImages())
  const [ratings, setRatings] = useState(() => loadRatings())

  const todayDayName = new Date().toLocaleDateString('en-US', { weekday:'long' })
  const todayMeal = WEEK_MEAL_PLAN[new Date().getDay()]

  // ── Persist / hydrate ───────────────────────────────────────────────────────
  useEffect(() => {
    const data = loadState()
    const monday = getCurrentMonday()
    if (data) {
      const expired = !data.lastReset || data.lastReset < monday
      if (!expired) {
        setMealDone(new Set(data.mealDone || []))
        const ic = {}; Object.entries(data.mealIngChecked||{}).forEach(([k,v]) => { ic[k] = new Set(v) }); setMealIngChecked(ic)
        const sd = {}; Object.entries(data.stepDone||{}).forEach(([k,v]) => { sd[k] = new Set(v) }); setStepDone(sd)
        setGroceryChecked(new Set(data.groceryChecked || []))
        setGroceryActualPrices(data.groceryActualPrices || {})
        setGroceryLogged(data.groceryLogged || false)
      }
      if (data.grocerySections) setGrocerySections(deepClone(data.grocerySections))
    }
    setInitialized(true)
  }, [])

  useEffect(() => {
    if (!initialized) return
    const ic = {}; Object.entries(mealIngChecked).forEach(([k,v]) => { ic[k] = [...v] })
    const sd = {}; Object.entries(stepDone).forEach(([k,v]) => { sd[k] = [...v] })
    saveState({ lastReset:getCurrentMonday(), mealDone:[...mealDone], mealIngChecked:ic, stepDone:sd, groceryChecked:[...groceryChecked], groceryActualPrices, groceryLogged, grocerySections })
  }, [initialized, mealDone, mealIngChecked, stepDone, groceryChecked, groceryActualPrices, groceryLogged, grocerySections])

  // ── Timers ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setTimerStates(prev => {
        let changed = false; const next = { ...prev }
        Object.entries(next).forEach(([k, t]) => {
          if (t.running && t.remaining > 0) { next[k] = { ...t, remaining:t.remaining-1 }; if (next[k].remaining<=0) next[k].running=false; changed=true }
        })
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  // ── Completion detection ────────────────────────────────────────────────────
  const prevStepRef = useRef({})
  useEffect(() => {
    RECIPE_MEALS.forEach(meal => {
      if (!meal.steps.length) return
      const sd = stepDone[meal.id] || new Set()
      const prev = prevStepRef.current[meal.id] || new Set()
      const allDone = meal.steps.every((_,i) => sd.has(i))
      const wasDone = meal.steps.every((_,i) => prev.has(i))
      if (allDone && !wasDone) {
        fireConfetti()
        setTimeout(() => setCelebration(meal.id), 400)
        setMealDone(p => { const n = new Set(p); n.add(meal.id); return n })
      }
    })
    prevStepRef.current = Object.fromEntries(Object.entries(stepDone).map(([k,v]) => [k, new Set(v)]))
  }, [stepDone])

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleImageSaved = (mealId, base64) => {
    const u = { ...images, [mealId]: base64 }; setImages(u); saveImages(u)
  }
  const toggleMealDone = id => setMealDone(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n })
  const toggleIngChecked = (mid, idx) => setMealIngChecked(p => { const s=new Set(p[mid]||[]); s.has(idx)?s.delete(idx):s.add(idx); return {...p,[mid]:s} })
  const toggleStepDone = (mid, idx) => setStepDone(p => { const s=new Set(p[mid]||[]); s.has(idx)?s.delete(idx):s.add(idx); return {...p,[mid]:s} })
  const toggleTimer = (mid, si) => {
    const key = `${mid}-${si}`
    setTimerStates(p => { const t=p[key]; if(!t) return p; if(t.running) return {...p,[key]:{...t,running:false}}; return {...p,[key]:{...t,running:true,started:true,remaining:t.remaining>0?t.remaining:MEALS.find(m=>m.id===mid).steps[si].min*60}} })
  }
  const resetTimer = (mid, si) => setTimerStates(p => ({...p,[`${mid}-${si}`]:{remaining:MEALS.find(m=>m.id===mid).steps[si].min*60,running:false,started:false}}))
  const toggleGrocery = key => setGroceryChecked(p => { const n=new Set(p); n.has(key)?n.delete(key):n.add(key); return n })
  const saveActualPrice = (sIdx, iIdx, val) => {
    const clean = val.trim().replace('$','')
    setGroceryActualPrices(p => ({...p,[`${sIdx}-${iIdx}`]:clean}))
    setEditingActual(null)
  }
  const addGroceryItem = () => {
    if (!newItem.name.trim()) return
    const sIdx = parseInt(newItem.section)
    setGrocerySections(p => { const n=deepClone(p); n[sIdx].items.push({ name:newItem.name.trim(), detail:newItem.detail.trim(), price:newItem.price.trim()?(newItem.price.startsWith('$')?newItem.price.trim():`$${newItem.price.trim()}`):'—', _custom:true }); return n })
    setNewItem(p => ({ name:'', detail:'', price:'', section:p.section }))
  }
  const removeCustomItem = (sIdx, iIdx) => {
    const key = `${sIdx}-${iIdx}`
    setGrocerySections(p => { const n=deepClone(p); n[sIdx].items.splice(iIdx,1); return n })
    setGroceryChecked(p => { const s=new Set(p); s.delete(key); return s })
    setGroceryActualPrices(p => { const n={...p}; delete n[key]; return n })
  }
  const handleReset = () => {
    if (!confirm('Reset this week? All progress will clear.')) return
    setMealDone(new Set()); setMealIngChecked({}); setStepDone({}); setGroceryChecked(new Set())
    setGroceryActualPrices({}); setGroceryLogged(false); setTimerStates(initTimers()); setModalMeal(null)
  }
  const handleLogGrocerySpend = () => {
    const amount = parseFloat(actualTotal.toFixed(2))
    if (!confirm(`Log $${amount.toFixed(2)} grocery spend from Chase? This will deduct from your balance.`)) return
    const live = useStore.getState()
    store.setAccount('chaseDebit', (live.accounts?.chaseDebit || 0) - amount)
    store.addTransaction({
      id: `tx-groc-${Date.now()}`,
      amount, type:'out', category:'Food',
      note: `Grocery Run — ${format(new Date(),'MMM d, yyyy')}`,
      account:'chaseDebit',
      date: format(new Date(),'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    })
    setGroceryLogged(true)
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const activeTimers = useMemo(() => {
    const list = []
    MEALS.forEach(m => m.steps.forEach((s, i) => { const t=timerStates[`${m.id}-${i}`]; if (t?.running) list.push({label:s.title,remaining:t.remaining}) }))
    return list
  }, [timerStates])
  const projectedTotal = useMemo(() => grocerySections.reduce((tot,sec) => tot+sec.items.reduce((s,item) => s+parsePrice(item.price),0),0), [grocerySections])
  const actualTotal = useMemo(() => {
    let sum = 0
    grocerySections.forEach((sec,sIdx) => sec.items.forEach((item,iIdx) => {
      const key = `${sIdx}-${iIdx}`, actual = groceryActualPrices[key]
      sum += actual!==undefined ? parseFloat(actual)||0 : parsePrice(item.price)
    }))
    return sum
  }, [grocerySections, groceryActualPrices])
  const totalItems = grocerySections.reduce((s,sec) => s+sec.items.length, 0)
  const groceryPct = totalItems > 0 ? Math.round((groceryChecked.size/totalItems)*100) : 0
  const visibleMeals = searchQuery ? ALL_RECIPE_MEALS.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase())) : ALL_RECIPE_MEALS

  const card = { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }
  const inputBase = { padding:'7px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, outline:'none', background:'#fafafa', color:C.text, fontFamily:'inherit' }

  // ── Recipe Card ─────────────────────────────────────────────────────────────
  const RecipeCard = ({ meal }) => {
    const isDone = mealDone.has(meal.id)
    const isTonight = meal.day === todayDayName
    const mealRating = Object.entries(ratings).find(([k]) => k.startsWith(`${meal.id}-`))?.[1]
    return (
      <div onClick={() => { setModalMeal(meal.id); setModalTab('steps') }}
        style={{ ...card, overflow:'hidden', cursor:'pointer', opacity:isDone?0.65:1, borderColor:isTonight&&!isDone?C.amber:C.border, boxShadow:isTonight&&!isDone?`0 0 0 2px ${C.amberBg}`:card.boxShadow, transition:'all 0.15s' }}>
        <div style={{ position:'relative', borderBottom:`1px solid ${C.border}` }}>
          <ImageZone meal={meal} images={images} onSave={handleImageSaved} size="card" />
          <span style={{ position:'absolute', top:7, left:7, background:'rgba(15,23,42,0.65)', color:'white', fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:99 }}>{meal.day}</span>
          {isTonight && !isDone && <span style={{ position:'absolute', top:7, right:7, background:C.amber, color:'white', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99 }}>Tonight</span>}
          {isDone && <span style={{ position:'absolute', top:7, right:7, background:C.green, color:'white', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99 }}>✓ Done</span>}
          {meal.weekTag && <span style={{ position:'absolute', bottom:7, left:7, background:'rgba(15,23,42,0.55)', color:'rgba(255,255,255,0.85)', fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:99 }}>{meal.weekTag}</span>}
        </div>
        <div style={{ padding:'10px 12px' }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.text, lineHeight:1.35, marginBottom:3 }}>{meal.title}</div>
          {mealRating && (
            <div style={{ fontSize:11, color:C.dim }}>
              {'⭐'.repeat(mealRating.difficulty)} · {['😕','😐','🙂','😋','🤤'][mealRating.taste-1]}
              {mealRating.timeTaken ? ` · ${mealRating.timeTaken} min` : ''}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Overview ────────────────────────────────────────────────────────────────
  const OverviewView = () => (
    <div>
      {todayMeal && (
        <div style={{ ...card, padding:'1rem 1.25rem', marginBottom:20, display:'flex', alignItems:'center', gap:14, borderColor:todayMeal.eatOut?C.border:C.amber, boxShadow:todayMeal.eatOut?card.boxShadow:`0 0 0 2px ${C.amberBg}` }}>
          <div style={{ fontSize:36 }}>{todayMeal.emoji}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.amber, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>Tonight's Dinner</div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{todayMeal.title}</div>
            {todayMeal.eatOut && <div style={{ fontSize:12, color:C.dim, marginTop:2 }}>No cooking tonight — enjoy your date night!</div>}
          </div>
          {!todayMeal.eatOut && todayMeal.mealId !== null && (
            <button onClick={() => { setModalMeal(todayMeal.mealId); setModalTab('steps') }}
              style={{ padding:'8px 16px', borderRadius:8, border:'none', background:C.panel, color:'white', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              🍳 Start Cooking
            </button>
          )}
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { label:'This Week', val:String(WEEK_MEALS.length), sub:'Dinners planned', color:C.amber },
          { label:'Completed', val:mealDone.size, sub:'Meals cooked', color:C.green },
          { label:'Budget', val:`$${GROCERY_BUDGET}`, sub:`$${GROCERY_MIN}–$${GROCERY_MAX} range`, color:C.text },
          { label:'Over/Under', val:`${(GROCERY_BUDGET-projectedTotal)>=0?'-':'+'} $${Math.abs(GROCERY_BUDGET-projectedTotal).toFixed(0)}`, sub:`Target $${GROCERY_BUDGET}`, color:(GROCERY_BUDGET-projectedTotal)>=0?C.green:C.red },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:C.dim, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4, fontWeight:600 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:700, color:k.color }}>{k.val}</div>
              <div style={{ fontSize:12, color:C.dim, marginTop:2 }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:14 }}>This Week's Meals</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))', gap:14 }}>
        {RECIPE_MEALS.map(m => <RecipeCard key={m.id} meal={m} />)}
      </div>
    </div>
  )

  // ── Recipes ─────────────────────────────────────────────────────────────────
  const RecipesView = () => (
    <div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>All Recipes</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))', gap:14 }}>
        {visibleMeals.map(m => <RecipeCard key={m.id} meal={m} />)}
      </div>
      {visibleMeals.length===0 && <div style={{ textAlign:'center', color:C.dim, padding:'3rem', fontSize:14 }}>No recipes match your search.</div>}
    </div>
  )

  // ── Planner ──────────────────────────────────────────────────────────────────
  const PlannerView = () => {
    const meal = selectedDay !== null ? WEEK_MEALS.find(m => m.id===selectedDay) : null
    const isDone = meal ? mealDone.has(meal.id) : false
    return (
      <div>
        <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>Weekly Meal Plan</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ ...card, overflow:'hidden' }}>
            {WEEK_MEALS.map((m, idx) => {
              const done = mealDone.has(m.id), tonight = m.day===todayDayName&&!m.eatOut, sel = selectedDay===m.id
              return (
                <div key={m.id} onClick={() => setSelectedDay(m.id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderBottom:idx<WEEK_MEALS.length-1?`1px solid ${C.border}`:'none', cursor:'pointer', background:sel?C.amberBg:m.eatOut?'#fffbeb':'white', transition:'background 0.1s' }}>
                  <span style={{ fontSize:18, width:28, textAlign:'center' }}>{m.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{m.day}</div>
                    <div style={{ fontSize:12, color:C.dim, marginTop:1 }}>{m.title}</div>
                  </div>
                  {m.eatOut ? <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'#fef3c7', color:C.amber }}>Eat Out</span>
                   : done ? <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:C.greenBg, color:C.green }}>✓ Done</span>
                   : tonight ? <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:C.amberBg, color:C.amber }}>Tonight</span>
                   : <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:C.blueBg, color:C.blue }}>Upcoming</span>}
                </div>
              )
            })}
          </div>
          <div style={card}>
            <div style={{ padding:'1.25rem' }}>
              {!meal ? (
                <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:C.dim }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📅</div>
                  <div style={{ fontSize:14, fontWeight:500 }}>Select a day to view details</div>
                </div>
              ) : meal.eatOut ? (
                <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
                  <div style={{ fontSize:52, marginBottom:12 }}>🎉</div>
                  <div style={{ fontSize:18, fontWeight:700, color:C.amber, marginBottom:6 }}>Date Night — Eating Out!</div>
                  <div style={{ fontSize:13, color:C.dim, marginBottom:8 }}>Friday night — no cooking tonight!</div>
                  <div style={{ background:'#fffbeb', border:`1px solid rgba(245,158,11,0.3)`, borderRadius:10, padding:'10px 14px', fontSize:13, color:'#92400e' }}>🍽️ Go enjoy a nice dinner out together</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:11, fontWeight:600, color:C.dim, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{meal.day}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:4 }}>{meal.title}</div>
                  <div style={{ fontSize:12, color:C.sub, marginBottom:14 }}>{meal.desc}</div>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:C.dim, marginBottom:8 }}>Ingredients</div>
                  {meal.ingredients.map((ing, j) => {
                    const isOn = (mealIngChecked[meal.id]||new Set()).has(j)
                    return (
                      <div key={j} onClick={() => toggleIngChecked(meal.id, j)}
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:`1px solid ${C.border}`, cursor:'pointer' }}>
                        <div style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${isOn?C.green:C.borderMd}`, background:isOn?C.green:'white', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'white' }}>{isOn?'✓':''}</div>
                        <span style={{ flex:1, fontSize:13, textDecoration:isOn?'line-through':'none', color:isOn?C.dim:C.text }}>{ing.name}</span>
                        <span style={{ fontSize:11, color:C.dim }}>{ing.qty}</span>
                      </div>
                    )
                  })}
                  <button onClick={() => { setModalMeal(meal.id); setModalTab('steps') }}
                    style={{ width:'100%', marginTop:14, background:C.panel, color:'white', border:'none', padding:'10px 0', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>🍳 Open Full Recipe</button>
                  <button onClick={() => toggleMealDone(meal.id)}
                    style={{ width:'100%', marginTop:8, background:isDone?'#f1f5f9':C.greenBg, color:isDone?C.dim:C.green, border:`1px solid ${isDone?C.border:'rgba(22,163,74,0.25)'}`, padding:'9px 0', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    {isDone ? '↩ Mark Incomplete' : '✓ Mark as Cooked'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Grocery ──────────────────────────────────────────────────────────────────
  const GroceryView = () => {
    const overallDiff = actualTotal - projectedTotal
    return (
      <div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))', gap:12, marginBottom:16 }}>
          {[
            { label:'Budget', val:`$${GROCERY_BUDGET}`, sub:`$${GROCERY_MIN}–$${GROCERY_MAX} range`, style:{ background:C.panel, color:'white' }, valColor:'white', subColor:'rgba(255,255,255,0.4)' },
            { label:'Projected', val:`$${projectedTotal.toFixed(2)}`, sub:'Sum of item prices', valColor:C.amber },
            { label:'Actual', val:`$${actualTotal.toFixed(2)}`, sub:'Using actual prices', valColor:C.text },
            { label:'Difference', val:Math.abs(overallDiff)<0.01?'—':`${overallDiff>0?'+':'-'}$${Math.abs(overallDiff).toFixed(2)}`, sub:overallDiff>0.01?'over projected':overallDiff<-0.01?'under projected':'on target', valColor:Math.abs(overallDiff)<0.01?C.text:overallDiff>0?C.red:C.green },
            { label:'Items', val:totalItems, sub:`${groceryChecked.size} checked off`, valColor:C.text },
          ].map(k => (
            <div key={k.label} style={{ ...card, ...k.style, padding:'14px 16px' }}>
              <div style={{ fontSize:11, color:k.subColor||C.dim, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4, fontWeight:600 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:700, color:k.valColor }}>{k.val}</div>
              <div style={{ fontSize:11, color:k.subColor||C.dim, marginTop:2 }}>{k.sub}</div>
            </div>
          ))}
        </div>
        {/* Budget range bar */}
        <div style={{ ...card, padding:'12px 16px', marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:600, color:C.text }}>Weekly Grocery Budget</span>
            <span style={{ fontSize:12, fontWeight:700, color:actualTotal>GROCERY_MAX?C.red:actualTotal<GROCERY_MIN?C.amber:C.green }}>
              ${actualTotal.toFixed(2)} / ${GROCERY_BUDGET}
            </span>
          </div>
          <div style={{ position:'relative', background:'#f1f5f9', borderRadius:99, height:10 }}>
            {/* Green zone: min → budget */}
            <div style={{ position:'absolute', left:`${(GROCERY_MIN/GROCERY_MAX)*100}%`, width:`${((GROCERY_BUDGET-GROCERY_MIN)/GROCERY_MAX)*100}%`, height:'100%', background:'rgba(22,163,74,0.15)', borderRadius:0 }} />
            {/* Spend fill */}
            <div style={{ height:'100%', borderRadius:99, background:actualTotal>GROCERY_MAX?C.red:actualTotal>GROCERY_BUDGET?C.amber:C.green, width:`${Math.min(100,(actualTotal/GROCERY_MAX)*100)}%`, transition:'width 0.3s' }} />
            {/* Min marker */}
            <div style={{ position:'absolute', left:`${(GROCERY_MIN/GROCERY_MAX)*100}%`, top:-2, height:14, width:2, background:'rgba(22,163,74,0.6)', borderRadius:1 }} />
            {/* Target marker */}
            <div style={{ position:'absolute', left:`${(GROCERY_BUDGET/GROCERY_MAX)*100}%`, top:-2, height:14, width:2, background:C.amber, borderRadius:1 }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.dim, marginTop:4 }}>
            <span>$0</span>
            <span style={{ color:C.green }}>min ${GROCERY_MIN}</span>
            <span style={{ color:C.amber }}>target ${GROCERY_BUDGET}</span>
            <span style={{ color:C.red }}>max ${GROCERY_MAX}</span>
          </div>
        </div>
        {/* Progress */}
        <div style={{ ...card, padding:'12px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, fontWeight:600, color:C.text, whiteSpace:'nowrap' }}>Shopping progress</span>
          <div style={{ flex:1, background:'#f1f5f9', borderRadius:99, height:7, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg,${C.amber},#d97706)`, width:`${groceryPct}%`, transition:'width 0.3s' }} />
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:C.amber, minWidth:36 }}>{groceryPct}%</span>
          <button onClick={() => setGroceryChecked(new Set())} style={{ fontSize:12, padding:'5px 11px', borderRadius:7, border:`1px solid ${C.border}`, background:'white', cursor:'pointer', color:C.dim }}>Clear all</button>
        </div>
        {/* Log spend */}
        <div style={{ ...card, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>Log Grocery Spend 💳</div>
            <div style={{ fontSize:12, color:C.dim, marginTop:2 }}>
              {groceryLogged ? '✅ Already logged this week' : `$${actualTotal.toFixed(2)} will be deducted from Chase balance`}
            </div>
          </div>
          <button onClick={handleLogGrocerySpend} disabled={groceryLogged}
            style={{ padding:'8px 16px', borderRadius:8, border:'none', background:groceryLogged?'#f1f5f9':C.panel, color:groceryLogged?C.dim:'white', fontSize:13, fontWeight:600, cursor:groceryLogged?'default':'pointer', whiteSpace:'nowrap' }}>
            {groceryLogged ? '✓ Logged' : 'Log to Finances'}
          </button>
        </div>
        {/* Add item */}
        <div style={{ ...card, padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:600, color:C.text, whiteSpace:'nowrap' }}>+ Add Item</span>
          <input type="text" placeholder="Item name..." value={newItem.name} onChange={e => setNewItem(p=>({...p,name:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addGroceryItem()} style={{ ...inputBase, flex:2, minWidth:110 }} />
          <input type="text" placeholder="Detail / meal..." value={newItem.detail} onChange={e => setNewItem(p=>({...p,detail:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addGroceryItem()} style={{ ...inputBase, flex:2, minWidth:110 }} />
          <select value={newItem.section} onChange={e => setNewItem(p=>({...p,section:e.target.value}))} style={{ ...inputBase, background:'white' }}>
            {DEFAULT_GROCERY_SECTIONS.map((sec,i) => <option key={i} value={i}>{sec.title}</option>)}
          </select>
          <input type="text" placeholder="$0.00" value={newItem.price} onChange={e => setNewItem(p=>({...p,price:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addGroceryItem()} style={{ ...inputBase, width:76 }} />
          <button onClick={addGroceryItem} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:C.panel, color:'white', fontSize:13, fontWeight:600, cursor:'pointer' }}>Add</button>
        </div>
        {/* Sections */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {grocerySections.map((sec, sIdx) => {
            if (!sec.items.length) return null
            return (
              <div key={sIdx} style={card}>
                <div style={{ padding:'14px 16px' }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:C.dim, marginBottom:10, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>{sec.title}</div>
                  {sec.items.map((item, iIdx) => {
                    const key = `${sIdx}-${iIdx}`
                    const isOn = groceryChecked.has(key)
                    const projected = parsePrice(item.price)
                    const actualStr = groceryActualPrices[key]
                    const actual = actualStr !== undefined ? parseFloat(actualStr)||0 : null
                    const diff = actual !== null ? actual - projected : null
                    const isEditing = editingActual?.sIdx===sIdx && editingActual?.iIdx===iIdx
                    return (
                      <div key={iIdx} onClick={() => !isEditing && toggleGrocery(key)}
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:iIdx<sec.items.length-1?'1px solid #f1f5f9':'none', cursor:'pointer' }}>
                        <div style={{ width:15, height:15, borderRadius:3, border:`1.5px solid ${isOn?C.green:C.borderMd}`, background:isOn?C.green:'white', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'white' }}>{isOn?'✓':''}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:500, textDecoration:isOn?'line-through':'none', color:isOn?C.dim:C.text }}>{item.name}</div>
                          {item.detail && <div style={{ fontSize:11, color:C.dim }}>{item.detail}</div>}
                        </div>
                        <div style={{ flexShrink:0, textAlign:'right' }} onClick={e => e.stopPropagation()}>
                          {isEditing ? (
                            <input autoFocus type="text" value={editActualVal} onChange={e => setEditActualVal(e.target.value)}
                              onBlur={() => saveActualPrice(sIdx, iIdx, editActualVal)}
                              onKeyDown={e => { if(e.key==='Enter') saveActualPrice(sIdx,iIdx,editActualVal); if(e.key==='Escape') setEditingActual(null) }}
                              style={{ width:70, padding:'3px 6px', border:`1.5px solid ${C.amber}`, borderRadius:6, fontSize:12, fontWeight:600, outline:'none', fontFamily:'inherit', textAlign:'right' }} />
                          ) : actual !== null ? (
                            <div>
                              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <span style={{ fontSize:12, color:C.dim, textDecoration:'line-through' }}>{item.price}</span>
                                <span onClick={() => { setEditingActual({sIdx,iIdx}); setEditActualVal(actualStr||'') }}
                                  style={{ fontSize:13, fontWeight:700, color:diff>0.01?C.red:diff<-0.01?C.green:C.text, cursor:'pointer' }}>
                                  ${actual.toFixed(2)}
                                </span>
                              </div>
                              {Math.abs(diff)>0.01 && <div style={{ fontSize:10, fontWeight:600, color:diff>0?C.red:C.green }}>{diff>0?`↑$${diff.toFixed(2)} more`:`↓$${Math.abs(diff).toFixed(2)} saved`}</div>}
                            </div>
                          ) : (
                            <span onClick={() => { setEditingActual({sIdx,iIdx}); setEditActualVal('') }}
                              title="Click to enter actual price paid"
                              style={{ fontSize:12, fontWeight:600, color:C.amber, cursor:'pointer', textDecoration:isOn?'line-through':'none' }}>
                              {item.price}
                            </span>
                          )}
                        </div>
                        {item._custom && (
                          <button onClick={e => { e.stopPropagation(); removeCustomItem(sIdx,iIdx) }}
                            style={{ background:'none', border:'none', color:C.dim, cursor:'pointer', fontSize:11, padding:'0 2px' }}>✕</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Modal Step Card ──────────────────────────────────────────────────────────
  const StepCard = ({ m, step, idx }) => {
    const sDone = stepDone[m.id] || new Set()
    const isDone = sDone.has(idx)
    const currentIdx = m.steps.findIndex((_,i) => !sDone.has(i))
    const isCurrent = idx === currentIdx
    const t = timerStates[`${m.id}-${idx}`]
    return (
      <div style={{ background:isDone?'#f8fafc':isCurrent?'white':'#f8fafc', border:`1px solid ${isCurrent?C.red:C.border}`, borderRadius:10, padding:14, opacity:isDone?0.5:1 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:isDone?C.green:isCurrent?C.red:'white', border:`1.5px solid ${isDone?C.green:isCurrent?C.red:C.borderMd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:(isDone||isCurrent)?'white':C.sub, flexShrink:0 }}>
              {isDone ? '✓' : idx+1}
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{step.title}</div>
          </div>
          <button onClick={() => toggleStepDone(m.id, idx)}
            style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${isDone?C.green:C.border}`, background:isDone?C.green:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'white', flexShrink:0 }}>
            {isDone?'✓':''}
          </button>
        </div>
        {(step.stove||step.min||step.warn) && (
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
            {step.stove && <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:99, background:C.amberBg, color:C.amber }}>🔥 {step.stove}</span>}
            {step.min && <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:99, background:C.blueBg, color:C.blue }}>⏱ {step.min} min</span>}
            {step.warn && <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:99, background:C.redBg, color:C.red }}>⚠ {step.warn}</span>}
          </div>
        )}
        <ul style={{ paddingLeft:16, margin:0 }}>
          {step.items.map((it,k) => <li key={k} style={{ fontSize:13, lineHeight:1.7, color:C.sub }}>{it}</li>)}
        </ul>
        {step.tip && <div style={{ background:C.amberBg, borderLeft:`3px solid ${C.amber}`, borderRadius:'0 6px 6px 0', padding:'6px 10px', fontSize:12, color:C.text, marginTop:8 }}>{step.tip}</div>}
        {t && (
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'white', border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', marginTop:10 }}>
            <span style={{ fontSize:18, fontWeight:700, minWidth:48, color:t.remaining<=0&&t.started?C.green:t.remaining<=30&&t.remaining>0?C.red:C.text }}>{t.remaining<=0&&t.started?'Done ✓':fmtTime(t.remaining)}</span>
            <button onClick={() => toggleTimer(m.id, idx)} style={{ fontSize:12, fontWeight:600, padding:'5px 10px', borderRadius:6, border:'none', cursor:'pointer', background:t.running?C.red:C.panel, color:'white' }}>{t.running?'⏸ Pause':'▶ Start'}</button>
            <button onClick={() => resetTimer(m.id, idx)} style={{ fontSize:12, fontWeight:600, padding:'5px 10px', borderRadius:6, border:`1px solid ${C.border}`, cursor:'pointer', background:'white', color:C.sub }}>↺</button>
            <span style={{ fontSize:11, color:C.dim, marginLeft:'auto' }}>{step.min} min</span>
          </div>
        )}
      </div>
    )
  }

  const TimersGrid = ({ m }) => {
    const timed = m.steps.filter(s=>s.min)
    if (!timed.length) return <div style={{ textAlign:'center', color:C.dim, fontSize:14, padding:'2rem' }}>No timed steps.</div>
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {m.steps.map((step, i) => {
          if (!step.min) return null
          const t = timerStates[`${m.id}-${i}`]; if (!t) return null
          return (
            <div key={i} style={{ background:'#f8fafc', border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:1 }}>{step.title}</div>
              <div style={{ fontSize:11, color:C.dim, marginBottom:10 }}>{step.min} min</div>
              <div style={{ fontSize:30, fontWeight:700, textAlign:'center', padding:'8px 0', color:t.remaining<=0&&t.started?C.green:t.remaining<=30&&t.remaining>0?C.red:C.text }}>{t.remaining<=0&&t.started?'Done ✓':fmtTime(t.remaining)}</div>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={() => toggleTimer(m.id, i)} style={{ flex:1, padding:'7px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:t.running?C.red:C.panel, color:'white' }}>{t.running?'⏸ Pause':'▶ Start'}</button>
                <button onClick={() => resetTimer(m.id, i)} style={{ padding:'7px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:'white', cursor:'pointer', fontSize:12, color:C.sub }}>↺</button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const meal = modalMeal !== null ? MEALS.find(m => m.id===modalMeal) : null
  const tabs = [
    { id:'overview', label:'🏠 Overview' }, { id:'recipes', label:'📖 Recipes' },
    { id:'planner', label:'📅 Meal Planner' }, { id:'grocery', label:'🛒 Grocery List' },
  ]

  return (
    <div style={{ background:C.bg, minHeight:'100%', fontFamily:'Inter, DM Sans, sans-serif', color:C.text }}>
      {/* Topbar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'white', borderBottom:`1px solid ${C.border}`, padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{tabs.find(t=>t.id===activeTab)?.label.replace(/^[^ ]+ /,'')}</div>
          <div style={{ fontSize:12, color:C.dim, marginTop:1 }}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
        </div>
        {activeTimers.length > 0 && (
          <div style={{ background:C.amberBg, border:`1px solid ${C.amberBd}`, borderRadius:8, padding:'6px 12px' }}>
            <div style={{ fontSize:10, color:C.dim, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2, fontWeight:600 }}>Active Timers</div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {activeTimers.map((t,i) => <span key={i} style={{ fontSize:12, fontWeight:700, color:C.red }}>{t.label}: {fmtTime(t.remaining)}</span>)}
            </div>
          </div>
        )}
        <button onClick={handleReset} style={{ fontSize:12, padding:'6px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:C.panel, color:'white', cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>↺ Reset Week</button>
      </div>
      {/* Tab nav */}
      <div style={{ background:'white', borderBottom:`1px solid ${C.border}`, display:'flex', padding:'0 24px', gap:2 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding:'10px 16px', fontSize:13, fontWeight:600, cursor:'pointer', border:'none', borderBottom:`2px solid ${activeTab===tab.id?C.amber:'transparent'}`, background:'transparent', color:activeTab===tab.id?C.amber:C.dim, transition:'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
        {activeTab==='recipes' && (
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', paddingBottom:4 }}>
            <input type="text" placeholder="🔍 Search recipes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ padding:'6px 12px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, outline:'none', background:'#fafafa', fontFamily:'inherit', width:190, color:C.text }} />
          </div>
        )}
      </div>
      {/* Content */}
      <div style={{ padding:24 }}>
        {activeTab==='overview' && <OverviewView />}
        {activeTab==='recipes'  && <RecipesView />}
        {activeTab==='planner'  && <PlannerView />}
        {activeTab==='grocery'  && <GroceryView />}
      </div>

      {/* Recipe Modal */}
      <AnimatePresence>
        {meal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div onClick={() => setModalMeal(null)} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} />
            <motion.div initial={{ scale:0.96, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.96, opacity:0 }}
              style={{ position:'relative', background:'white', width:'min(700px,95vw)', margin:'auto', borderRadius:16, overflow:'hidden', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <ImageZone meal={meal} images={images} onSave={handleImageSaved} size="modal" />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(15,23,42,0.85) 60%,transparent)', display:'flex', alignItems:'flex-end', padding:'1rem 1.5rem', zIndex:2, pointerEvents:'none' }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:C.amber, textTransform:'uppercase', marginBottom:3 }}>{meal.day} · {meal.date}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:'white' }}>{meal.title}</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
                      {['👥 Serves 2','🍳 Stovetop','🌡 Lo–2–4–Med–6–8–High'].map(p => (
                        <span key={p} style={{ fontSize:11, fontWeight:500, padding:'3px 9px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.9)' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => setModalMeal(null)} style={{ position:'absolute', top:'0.75rem', right:'1rem', background:'rgba(255,255,255,0.2)', border:'none', color:'white', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:14, zIndex:3 }}>✕</button>
              </div>
              <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, background:'white', flexShrink:0 }}>
                {['steps','ingredients','timers'].map(t => (
                  <button key={t} onClick={() => setModalTab(t)}
                    style={{ padding:'10px 18px', fontSize:13, fontWeight:600, color:modalTab===t?C.amber:C.dim, cursor:'pointer', border:'none', borderBottom:`2px solid ${modalTab===t?C.amber:'transparent'}`, background:'transparent', transition:'all 0.15s', textTransform:'capitalize' }}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ overflowY:'auto', flex:1, padding:'1.25rem 1.5rem' }}>
                {modalTab==='steps' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {meal.steps.map((step, i) => <StepCard key={i} m={meal} step={step} idx={i} />)}
                  </div>
                )}
                {modalTab==='ingredients' && (
                  <div>
                    {meal.ingredients.map((ing, j) => {
                      const isOn = (mealIngChecked[meal.id]||new Set()).has(j)
                      return (
                        <div key={j} onClick={() => toggleIngChecked(meal.id, j)}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:isOn?'white':'#f8fafc', borderRadius:8, marginBottom:4, cursor:'pointer', border:`1px solid ${C.border}` }}>
                          <div style={{ width:15, height:15, borderRadius:3, border:`1.5px solid ${isOn?C.green:C.borderMd}`, background:isOn?C.green:'white', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'white' }}>{isOn?'✓':''}</div>
                          <span style={{ flex:1, fontSize:13, fontWeight:500, textDecoration:isOn?'line-through':'none', color:isOn?C.dim:C.text }}>{ing.name}</span>
                          <span style={{ fontSize:12, color:C.dim }}>{ing.qty}</span>
                        </div>
                      )
                    })}
                    <button onClick={() => toggleMealDone(meal.id)}
                      style={{ width:'100%', marginTop:12, background:C.panel, color:'white', border:'none', padding:'10px 0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                      {mealDone.has(meal.id) ? '↩ Mark Incomplete' : '✓ Mark as Cooked'}
                    </button>
                  </div>
                )}
                {modalTab==='timers' && <TimersGrid m={meal} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Modal */}
      <AnimatePresence>
        {celebration !== null && (
          <CelebrationModal
            meal={MEALS.find(m => m.id===celebration)}
            onClose={() => { setRatings(loadRatings()); setCelebration(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
