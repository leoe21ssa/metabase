// Fork (spec 001): pure logic of the dashcard metric selector. No React, Redux or dashboard imports.
import { updateIn } from "icepick";

import type { RawSeries, VisualizationSettings } from "metabase-types/api";

export type MetricSelectorState = {
  metrics: { key: string; label: string }[];
  defaultKey: string;
};

/** The `graph.metrics` keys that still are columns of the result, in graph order. */
export function getMetricKeysInResult(
  rawSeries: RawSeries,
  settings: VisualizationSettings,
): string[] {
  const cols = rawSeries[0]?.data?.cols ?? [];
  return (settings["graph.metrics"] ?? []).filter((key) =>
    cols.some((col) => col.name === key),
  );
}

/** Whether a chart can have a selector: one question, no breakout, two or more metrics. */
export function isMetricSelectorApplicable(
  rawSeries: RawSeries,
  settings: VisualizationSettings,
): boolean {
  return (
    rawSeries.length === 1 &&
    (settings["graph.dimensions"] ?? []).filter(Boolean).length <= 1 &&
    getMetricKeysInResult(rawSeries, settings).length >= 2
  );
}

/** Visible name of a metric: its series title, else its column name, else the key. */
export function getMetricLabel(
  rawSeries: RawSeries,
  settings: VisualizationSettings,
  key: string,
): string {
  return (
    settings.series_settings?.[key]?.title ||
    rawSeries[0]?.data?.cols.find((col) => col.name === key)?.display_name ||
    key
  );
}

/**
 * Decides whether the selector applies to a series and, if so, which buttons it
 * has and which one is the initial choice. Returns null when it does not apply:
 * added series, selector disabled, a breakout, or fewer than two metrics.
 */
export function getMetricSelectorState(
  rawSeries: RawSeries,
  settings: VisualizationSettings,
): MetricSelectorState | null {
  if (
    !settings["graph.metric_selector.enabled"] ||
    !isMetricSelectorApplicable(rawSeries, settings)
  ) {
    return null;
  }

  const metricsInResult = getMetricKeysInResult(rawSeries, settings);
  const configured =
    settings["graph.metric_selector.metrics"] ??
    metricsInResult.map((key) => ({ key, enabled: true }));
  const included = configured.filter(
    (metric) => metric.enabled && metricsInResult.includes(metric.key),
  );
  if (included.length < 2) {
    return null;
  }

  const configuredDefault = settings["graph.metric_selector.default"];
  const defaultKey =
    configuredDefault != null &&
    included.some((metric) => metric.key === configuredDefault)
      ? configuredDefault
      : included[0].key;

  return {
    metrics: included.map((metric) => ({
      key: metric.key,
      label: getMetricLabel(rawSeries, settings, metric.key),
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
