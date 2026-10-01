import { t } from "ttag";

import { Box } from "metabase/ui";
import type { MetricSelectorMetric } from "metabase-types/api";

import { ChartSettingMessage } from "./ChartSettingMessage";
import { ChartSettingOrderedSimple } from "./ChartSettingOrderedSimple";

const MIN_INCLUDED_METRICS = 2;

const noop = () => undefined;

export interface ChartSettingMetricSelectorMetricsProps {
  value: MetricSelectorMetric[];
  onChange: (value: MetricSelectorMetric[]) => void;
  /** Visible name of each metric, by key. The setting definition computes it. */
  metricNames: Record<string, string>;
}

// Fork (spec 001, RF-5, RF-9): checkbox and drag list of the metrics the selector offers.
export const ChartSettingMetricSelectorMetrics = ({
  value = [],
  onChange,
  metricNames = {},
}: ChartSettingMetricSelectorMetricsProps) => {
  const items = value.map(({ key, enabled }) => ({
    key,
    enabled,
    name: metricNames[key] ?? key,
  }));
  const handleChange = (newItems: MetricSelectorMetric[]) =>
    onChange(newItems.map(({ key, enabled }) => ({ key, enabled })));
  const includedCount = value.filter((metric) => metric.enabled).length;

  return (
    <>
      <ChartSettingOrderedSimple
        value={items}
        onChange={handleChange}
        onSortEnd={handleChange}
        hasEditSettings={false}
        series={[]}
        onShowWidget={noop}
        onChangeSeriesColor={noop}
      />
      {includedCount < MIN_INCLUDED_METRICS && (
        <Box pl="lg" pb="sm">
          <ChartSettingMessage>{t`Check at least two metrics to show the selector`}</ChartSettingMessage>
        </Box>
      )}
    </>
  );
};
