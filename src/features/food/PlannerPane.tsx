import { Card, Button, QueryBoundary } from '@/components/ui';
import { useRecipes, type Recipe } from '@/data/reference';
import {
  useMealPlan,
  useSetMealPlan,
  useClearMealPlanDay,
  useAddManyToBasket,
} from '@/data/user';
import { formatDate, addDays, dayOfWeek, parseLocalDate } from '@/domain/dates';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Assign a dinner to each day of the current week; auto-suggest fills gaps;
 *  send the week to the shopping basket. Dinner-only (SPEC §6.5). */
export function PlannerPane() {
  const recipes = useRecipes();
  const plan = useMealPlan();
  const setDay = useSetMealPlan();
  const clearDay = useClearMealPlanDay();
  const addToBasket = useAddManyToBasket();

  const today = formatDate(new Date());
  const monday = addDays(today, -((dayOfWeek(today) + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <QueryBoundary queries={[recipes, plan]}>
      {([recipeList, planList]) => {
        const dinners = recipeList.filter((r) => r.meal_type === 'dinner');
        const byDate = new Map(planList.map((e) => [e.plan_date, e.recipe_slug]));
        const planned = week.map((d) => byDate.get(d)).filter((s): s is string => !!s);

        const autoSuggest = () => {
          week.forEach((d, i) => {
            if (byDate.get(d)) return;
            const pick = dinners[(i * 7 + d.charCodeAt(8)) % dinners.length];
            if (pick) setDay.mutate({ plan_date: d, recipe_slug: pick.slug });
          });
        };

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={autoSuggest}>
                Auto-suggest gaps
              </Button>
              <Button onClick={() => addToBasket.mutate(planned)}>
                {addToBasket.isPending ? 'Sending…' : `Send week to shopping list (${planned.length})`}
              </Button>
            </div>

            {week.map((d) => (
              <Card key={d}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-data font-bold text-text">
                    {DOW[(dayOfWeek(d) + 6) % 7]} {parseLocalDate(d).getDate()}
                  </span>
                  {byDate.get(d) && (
                    <button
                      onClick={() => clearDay.mutate(d)}
                      className="text-body-sm text-danger hover:opacity-80"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <select
                  value={byDate.get(d) ?? ''}
                  onChange={(e) =>
                    e.target.value
                      ? setDay.mutate({ plan_date: d, recipe_slug: e.target.value })
                      : clearDay.mutate(d)
                  }
                  className="mt-2 min-h-tap w-full rounded-md border border-border bg-surface px-2 text-body-sm text-text"
                >
                  <option value="">— no dinner —</option>
                  {dinners.map((r: Recipe) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Card>
            ))}
          </div>
        );
      }}
    </QueryBoundary>
  );
}
