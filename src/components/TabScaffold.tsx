import type { ReactNode } from 'react';

/**
 * Shared page chrome for the six tabs. `title` renders in Archivo Narrow bold
 * (the design's heading treatment); pass `hideTitle` for screens that lead with
 * their own hero (e.g. Today).
 *
 * At ≥lg the SideNav is fixed on the left, so content is offset by the sidebar
 * width. `wide` drops the reading-width cap so two-pane master/detail pages
 * (Calendar, Food, Plan) can fill the remaining space (SPEC §8).
 */
export function TabScaffold({
  title,
  hideTitle = false,
  wide = false,
  children,
}: {
  title: string;
  hideTitle?: boolean;
  wide?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="pb-28 pt-4 lg:pb-8 lg:pl-sidebar">
      <div className={`px-4 lg:px-6 ${wide ? 'mx-auto max-w-[1400px]' : 'mx-auto max-w-content'}`}>
        {!hideTitle && (
          <h1 className="mb-4 font-display text-[26px] font-bold leading-tight text-text">{title}</h1>
        )}
        <div className="text-body text-text-muted">
          {children ?? <p>Coming in a later phase.</p>}
        </div>
      </div>
    </section>
  );
}
