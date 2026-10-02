// Fork (spec 001): setting definitions of the dashcard metric selector. They live here and not
// in viz-core because viz-core cannot import from visualizations and is only reachable through
// its index.
import { t } from "ttag";

import type {
  ComputedVisualizationSettings,
  SettingsExtra,
  VisualizationSettingDefinition,
} from "metabase/viz-core";
import type { MetricSelectorMetric, Series } from "metabase-types/api";

import {
  getMetricKeysInResult,
  getMetricLabel,
  isMetricSelectorApplicable,
} from "./metric-selector";

type SettingDefinition<
  TValue,
  TProps extends Record<string, unknown> = Record<string, unknown>,
> = VisualizationSettingDefinition<Series, TValue, TProps>;

type MetricsWidgetProps = { metricNames: Record<string, string> };
type DefaultWidgetProps = { options: { name: string; value: string }[] };

// Only on dashboards, with one question, no breakout and two or more metrics.
const isUnavailable = (
  series: Series,
  settings: ComputedVisualizationSettings,
  extra?: SettingsExtra,
) => !extra?.isDashboard || !isMetricSelectorApplicable(series, settings);

const isDisabled = (
  series: Series,
  settings: ComputedVisualizationSettings,
  extra?: SettingsExtra,
) =>
  isUnavailable(series, settings, extra) ||
  !settings["graph.metric_selector.enabled"];

const getIncludedMetrics = (settings: ComputedVisualizationSettings) =>
  (settings["graph.metric_selector.metrics"] ?? []).filter(
    (metric) => metric.enabled,
  );

const enabled: SettingDefinition<boolean> = {
  get title() {
    return t`Metric selector`;
  },
  widget: "toggle",
  inline: true,
  getDefault: () => false,
  getHidden: isUnavailable,
  dashboard: true,
  useRawSeries: true,
};

const metrics: SettingDefinition<MetricSelectorMetric[], MetricsWidgetProps> = {
  get title() {
    return t`Included metrics`;
  },
  widget: "metricSelectorMetrics",
  // Reconciles the stored value with the chart: keeps the order and state of the metrics that
  // are still plotted, drops the ones that are gone and appends the new ones as included.
  getValue: (series, settings) => {
    const keys = getMetricKeysInResult(series, settings);
    const kept = (settings["graph.metric_selector.metrics"] ?? []).filter(
      (metric) => keys.includes(metric.key),
    );
    const added = keys
      .filter((key) => kept.every((metric) => metric.key !== key))
      .map((key) => ({ key, enabled: true }));
    return [...kept, ...added];
  },
  getProps: (series, settings) => ({
    metricNames: Object.fromEntries(
      (settings["graph.metric_selector.metrics"] ?? []).map(({ key }) => [
        key,
        getMetricLabel(series, settings, key),
      ]),
    ),
  }),
  getHidden: isDisabled,
  readDependencies: ["graph.metrics", "series_settings"],
  dashboard: true,
  useRawSeries: true,
};

const defaultMetric: SettingDefinition<string | undefined, DefaultWidgetProps> =
  {
    get title() {
      return t`Initial metric`;
    },
    widget: "select",
    isValid: (_series, settings) =>
      getIncludedMetrics(settings).some(
        (metric) => metric.key === settings["graph.metric_selector.default"],
      ),
    getDefault: (_series, settings) => getIncludedMetrics(settings)[0]?.key,
    getProps: (series, settings) => ({
      options: getIncludedMetrics(settings).map(({ key }) => ({
        name: getMetricLabel(series, settings, key),
        value: key,
      })),
    }),
    getHidden: isDisabled,
    readDependencies: ["graph.metric_selector.metrics"],
    dashboard: true,
    useRawSeries: true,
  };

export const GRAPH_METRIC_SELECTOR_SETTINGS = {
  "graph.metric_selector.enabled": enabled,
  "graph.metric_selector.metrics": metrics,
  "graph.metric_selector.default": defaultMetric,
};
