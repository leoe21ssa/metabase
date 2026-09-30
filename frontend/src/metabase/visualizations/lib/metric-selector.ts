// Fork (spec 001): pure logic of the dashcard metric selector. No React, Redux or dashboard imports.
import { updateIn } from "icepick";

import type { RawSeries, VisualizationSettings } from "metabase-types/api";

export type MetricSelectorState = {
  metrics: { key: string; label: string }[];
  defaultKey: string;
};

/**
 * Decides whether the selector applies to a series and, if so, which buttons it
 * has and which one is the initial choice. Returns null when it does not apply:
 * added series, selector disabled, a breakout, or fewer than two metrics.
 */
export function getMetricSelectorState(
  rawSeries: RawSeries,
  settings: VisualizationSettings,
): MetricSelectorState | null {
  if (rawSeries.length !== 1 || !settings["graph.metric_selector.enabled"]) {
    return null;
  }
  if ((settings["graph.dimensions"] ?? []).filter(Boolean).length > 1) {
    return null;
  }

  const cols = rawSeries[0].data.cols;
  const metricsInResult = (settings["graph.metrics"] ?? []).filter((key) =>
    cols.some((col) => col.name === key),
  );
  if (metricsInResult.length < 2) {
    return null;
  }

  const configured =
    settings["graph.metric_selector.metrics"] ??
    metricsInResult.map((key) => ({ key, enabled: true }));
  const included = configured.filter(
    (metric) => metric.enabled && metricsInResult.includes(metric.key),
  );
  if (included.length < 2) {
    return null;
  }

  const label = (key: string) =>
    settings.series_settings?.[key]?.title ||
    cols.find((col) => col.name === key)?.display_name ||
    key;

  const configuredDefault = settings["graph.metric_selector.default"];
  const defaultKey =
    configuredDefault != null &&
    included.some((metric) => metric.key === configuredDefault)
      ? configuredDefault
      : included[0].key;

  return {
    metrics: included.map((metric) => ({
      key: metric.key,
      label: label(metric.key),
    })),
    defaultKey,
  };
}

/**
 * Narrows the plotted metrics of the first card to `key`. Rows, columns and the
 * other settings are shared, not copied. Returns the same reference when `key`
 * is not one of the card's `graph.metrics`.
 */
export function selectMetric(rawSeries: RawSeries, key: string): RawSeries {
  const metrics = rawSeries[0]?.card.visualization_settings?.["graph.metrics"];
  if (!metrics?.includes(key)) {
    return rawSeries;
  }
  return updateIn(
    rawSeries,
    [0, "card", "visualization_settings", "graph.metrics"],
    () => [key],
  );
}

/** The key to show: `currentKey` while it is still offered, else the default. */
export function resolveSelectedKey(
  state: MetricSelectorState,
  currentKey: string | null | undefined,
): string {
  return currentKey != null &&
    state.metrics.some((metric) => metric.key === currentKey)
    ? currentKey
    : state.defaultKey;
}
