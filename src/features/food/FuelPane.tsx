import { Card, Eyebrow } from '@/components/ui';
import { Icon } from '@/components/Icon';

/** Static gout-aware fuel guidance, ported from the legacy app (Food → Fuel). */
export function FuelPane() {
  return (
    <div className="space-y-4">
      <Card>
        <Eyebrow bullet>The gout framework</Eyebrow>
        <p className="mt-1 text-body-sm text-text-muted">
          A suspected urate sensitivity shapes the plan more than the training does. The evidence
          points to a veg-forward, dairy-friendly, Asian-leaning diet being close to ideal.
        </p>
        <div className="mt-3 space-y-2">
          <TrafficLight
            tone="border-l-success"
            label="Green — eat freely"
            body="All vegetables (plant purines don't raise gout risk) · tofu, tempeh, edamame · lentils, chickpeas, beans · eggs · low-fat dairy, Greek yogurt, skyr, paneer (protective — a serving daily) · whole grains, rice, noodles, oats · all fruit, especially cherries & berries · nuts & seeds · coffee & tea · chilli, ginger, garlic, all spices"
          />
          <TrafficLight
            tone="border-l-warning"
            label="Amber — moderate portions"
            body="Salmon, trout, white fish (2–3 portions/week) · chicken (1–2×/week) · fish/oyster sauce, dashi — seasoning, teaspoons not tablespoons · wine (modest) · fruit juice & honey (fructose raises urate)"
          />
          <TrafficLight
            tone="border-l-danger"
            label="Red — avoid"
            body="Organ meats · anchovies, sardines, mackerel, herring · mussels, scallops; easy on prawns/squid · red & processed meat · beer (incl. alcohol-free with yeast extract) · yeast extract (Marmite) · sugary drinks & excess added sugar · crash diets and dehydration"
          />
        </div>
      </Card>

      <Card>
        <Eyebrow bullet meta={<Icon name="local_fire_department" size={14} fill className="text-warning" />}>Daily targets</Eyebrow>
        <p className="mt-1 text-body-sm text-text-dim">180 cm · ~80 kg · 5–6 runs + 3 lifts/wk</p>
        <dl className="mt-2 space-y-2 text-body-sm">
          <Target k="Calories" v="~2,500–2,700 kcal easy days · ~2,900–3,200 long-run days. A gentle ~300 kcal average deficit trims 2–3 kg without wrecking recovery. Never crash-cut — rapid loss can trigger flares." />
          <Target k="Protein" v="130–145 g/day (~1.7 g/kg), biased to tofu, eggs, dairy and legumes. Four feedings; one dairy hit near training." />
          <Target k="Carbs" v="Fuel the work: 400 g+ on long-run days, moderate elsewhere. Rice, noodles, oats, potatoes." />
          <Target k="Fluids" v="2–3 L/day baseline, more around runs. Dehydration is a classic flare trigger — treat hydration as gout medicine." />
          <Target k="Protective extras" v="Daily: low-fat dairy + cherries/berries + coffee if you drink it. Vitamin-C-rich fruit and veg throughout." />
        </dl>
      </Card>

      <Card>
        <Eyebrow bullet>Breakfast &amp; lunch templates</Eyebrow>
        <dl className="mt-2 space-y-2 text-body-sm">
          <Target k="Breakfast" v="Run days: overnight oats or peanut-butter porridge. Rest days: scrambled eggs & avocado, or the miso egg rice bowl. After a long run: the cherry recovery smoothie." />
          <Target k="Lunch — free" v="Last night's dinner ×1.5 — cook 3 portions, box one. The cheapest recipe in the file." />
          <Target k="Lunch — built" v="25 assembly-only lunches (bowls, wraps, salads, toast). No hob. Aim for 3 built + 2 leftover lunches a week." />
          <Target k="Sunday hour" v="Bake one savoury batch and one sweet — lunchbox padding and run fuel for the week in one oven session." />
          <Target k="Post-session" v="Within ~an hour of hard work: 25–35 g protein. Skyr + banana, or a milk shake — dairy protein doubles as gout protection." />
        </dl>
      </Card>

      <p className="px-1 text-meta text-text-dim">
        Coaching guidance, not medical advice — with a suspected genetic urate sensitivity, a GP
        urate baseline is worth doing before the training load peaks.
      </p>
    </div>
  );
}

function TrafficLight({ tone, label, body }: { tone: string; label: string; body: string }) {
  return (
    <div className={`border-l-4 ${tone} rounded-r-md bg-surface-raised p-3`}>
      <p className="font-display text-body-sm uppercase tracking-wide text-text">{label}</p>
      <p className="mt-1 text-body-sm text-text-muted">{body}</p>
    </div>
  );
}

function Target({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 narrow:grid-cols-1 narrow:gap-0.5">
      <dt className="font-display uppercase tracking-wide text-text-dim">{k}</dt>
      <dd className="text-text-muted">{v}</dd>
    </div>
  );
}
