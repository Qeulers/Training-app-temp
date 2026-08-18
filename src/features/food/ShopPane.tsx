import { Card, Button, Eyebrow, QueryBoundary } from '@/components/ui';
import { Icon } from '@/components/Icon';
import {
  useRecipes,
  useRecipeIngredients,
  useStaples,
  useCategories,
  useAppContent,
} from '@/data/reference';
import { useBasket, useShoppingChecks, useToggleCheck, useClearBasket } from '@/data/user';
import { aggregate, type RecipeWithIngredients } from '@/domain/shoppingList';

/** Aggregated shopping list grouped by ingredient category, with check-off
 *  (SPEC §6.5 / §7.4). Full offline support lands in Phase 5. */
export function ShopPane() {
  const recipes = useRecipes();
  const ingredients = useRecipeIngredients();
  const staples = useStaples();
  const categories = useCategories();
  const exceptions = useAppContent<string[]>('pluralisation_exceptions');
  const basket = useBasket();
  const checks = useShoppingChecks();

  const toggle = useToggleCheck();
  const clear = useClearBasket();

  return (
    <QueryBoundary
      queries={[recipes, ingredients, staples, categories, exceptions, basket, checks]}
    >
      {([recipeList, ingList, stapleList, catList, exList, basketList, checkList]) => {
        if (basketList.length === 0) {
          return (
            <Card>
              <p className="text-body-sm text-text-muted">
                No recipes selected yet. Add dinners or lunches from Recipes, or send a week across
                from the Planner — ingredients get combined and sorted by aisle here.
              </p>
            </Card>
          );
        }

        const ingByRecipe = new Map<string, typeof ingList>();
        for (const i of ingList)
          (ingByRecipe.get(i.recipe_slug) ?? ingByRecipe.set(i.recipe_slug, []).get(i.recipe_slug)!).push(i);

        const chosen: RecipeWithIngredients[] = basketList
          .map((b) => recipeList.find((r) => r.slug === b.recipe_slug))
          .filter((r): r is NonNullable<typeof r> => !!r)
          .map((r) => ({
            slug: r.slug,
            name: r.name,
            ingredients: (ingByRecipe.get(r.slug) ?? []).map((i) => ({
              ingredient_name: i.ingredient_name,
              quantity_text: i.quantity_text,
              category_code: i.category_code,
            })),
          }));

        const groups = aggregate({
          recipes: chosen,
          staples: stapleList.map((s) => ({
            ingredient_name: s.ingredient_name,
            quantity_text: s.quantity_text,
            category_code: s.category_code,
          })),
          categories: catList,
          exceptions: exList ?? [],
        });
        const checked = new Set(checkList.map((c) => c.item_key));

        // Progress bar stats
        const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);
        const checkedCount = groups.reduce(
          (acc, g) => acc + g.items.filter((item) => checked.has(item.item_key)).length,
          0,
        );
        const progressFraction = totalItems > 0 ? checkedCount / totalItems : 0;

        return (
          <div className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
                  style={{ width: `${progressFraction * 100}%` }}
                />
              </div>
              <p className="mt-1 text-right text-meta text-text-dim">
                {checkedCount} / {totalItems}
              </p>
            </div>

            {/* Basket header */}
            <Card>
              <p className="text-body-sm text-text-muted">
                {basketList.length} recipe{basketList.length > 1 ? 's' : ''} selected · staples
                included at the end of each aisle.
              </p>
              <div className="mt-2">
                <Button variant="ghost" onClick={() => clear.mutate()}>
                  Clear basket
                </Button>
              </div>
            </Card>

            {groups.map((g) => (
              <div key={g.code}>
                <Eyebrow tone="accent" meta={g.items.length} className="mb-2">
                  {g.label}
                </Eyebrow>
                <Card className="divide-y divide-border p-0">
                  {g.items.map((item) => {
                    const isChecked = checked.has(item.item_key);
                    // Build recipe sub-line: show recipe names when item appears in recipes
                    const subLine = item.from.length > 0 ? item.from.join(' · ') : null;
                    return (
                      <label
                        key={item.item_key}
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-opacity duration-fast ${
                          isChecked ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Custom checkbox: rounded square, green filled check when checked */}
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-fast ${
                            isChecked
                              ? 'border-accent bg-accent text-accent-ink'
                              : 'border-border bg-surface'
                          }`}
                          aria-hidden
                        >
                          {isChecked && <Icon name="check_circle" size={14} fill />}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            toggle.mutate({ item_key: item.item_key, checked: isChecked })
                          }
                          className="sr-only"
                        />
                        <span className="flex-1 min-w-0">
                          <span
                            className={`block text-body-sm text-text ${
                              isChecked ? 'line-through text-text-dim' : ''
                            }`}
                          >
                            {item.ingredient_name}
                          </span>
                          {subLine && (
                            <span className="block truncate text-meta text-text-dim">
                              {subLine}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-body-sm text-text-dim">
                          {item.quantity_text}
                        </span>
                      </label>
                    );
                  })}
                </Card>
              </div>
            ))}
          </div>
        );
      }}
    </QueryBoundary>
  );
}
