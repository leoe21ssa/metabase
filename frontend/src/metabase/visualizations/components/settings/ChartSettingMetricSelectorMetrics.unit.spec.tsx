import userEvent from "@testing-library/user-event";

import { render, screen } from "__support__/ui";
import type { MetricSelectorMetric } from "metabase-types/api";

import { ChartSettingMetricSelectorMetrics } from "./ChartSettingMetricSelectorMetrics";

const METRIC_NAMES = {
  sum: "Revenue",
  count: "Count",
  avg: "Average of Total",
};

const WARNING = "Check at least two metrics to show the selector";

const setup = (value: MetricSelectorMetric[]) => {
  const onChange = jest.fn();

  render(
    <ChartSettingMetricSelectorMetrics
      value={value}
      onChange={onChange}
      metricNames={METRIC_NAMES}
    />,
  );

  return { onChange };
};

describe("ChartSettingMetricSelectorMetrics", () => {
  it("RF-5 lists the metrics with their visible names in the configured order", () => {
    setup([
      { key: "avg", enabled: true },
      { key: "sum", enabled: true },
      { key: "count", enabled: false },
    ]);

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Average of Total", "Revenue", "Count"]);
  });

  it("RF-5 unchecking a metric calls onChange with the new value", async () => {
    const { onChange } = setup([
      { key: "sum", enabled: true },
      { key: "count", enabled: true },
      { key: "avg", enabled: true },
    ]);

    await userEvent.click(screen.getByTestId("Count-hide-button"));

    expect(onChange).toHaveBeenCalledWith([
      { key: "sum", enabled: true },
      { key: "count", enabled: false },
      { key: "avg", enabled: true },
    ]);
  });

  it("RF-5 checking a metric again calls onChange with the new value", async () => {
    const { onChange } = setup([
      { key: "sum", enabled: true },
      { key: "count", enabled: false },
    ]);

    await userEvent.click(screen.getByTestId("Count-show-button"));

    expect(onChange).toHaveBeenCalledWith([
      { key: "sum", enabled: true },
      { key: "count", enabled: true },
    ]);
  });

  it("RF-9 shows the warning with fewer than two included metrics", () => {
    setup([
      { key: "sum", enabled: true },
      { key: "count", enabled: false },
      { key: "avg", enabled: false },
    ]);

    expect(screen.getByText(WARNING)).toBeInTheDocument();
  });

  it("RF-9 does not show the warning with two or more included metrics", () => {
    setup([
      { key: "sum", enabled: true },
      { key: "count", enabled: true },
      { key: "avg", enabled: false },
    ]);

    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });
});
