import type { RawSeries, VisualizationSettings } from "metabase-types/api";
import {
  createMockCard,
  createMockColumn,
  createMockDataset,
} from "metabase-types/api/mocks";

import {
  type MetricSelectorState,
  getMetricSelectorState,
  resolveSelectedKey,
  selectMetric,
} from "./metric-selector";

const cols = [
  createMockColumn({ name: "CREATED_AT", display_name: "Created At" }),
  createMockColumn({ name: "sum", display_name: "Sum of Total" }),
  createMockColumn({ name: "count", display_name: "Count" }),
  createMockColumn({ name: "avg", display_name: "Average of Total" }),
];
const rows = [
  ["2026-01-01", 10, 1, 10],
  ["2026-02-01", 30, 2, 15],
];

const baseSettings: VisualizationSettings = {
  "graph.dimensions": ["CREATED_AT"],
  "graph.metrics": ["sum", "count", "avg"],
  "graph.metric_selector.enabled": true,
};

function createSeries(
  settings: VisualizationSettings = baseSettings,
): RawSeries {
  return [
    {
      card: createMockCard({
        display: "line",
        visualization_settings: settings,
      }),
      ...createMockDataset({ data: { cols, rows } }),
    },
  ];
}

describe("getMetricSelectorState", () => {
  it("RF-2 returns null when the selector is disabled or unset", () => {
    const disabled = {
      ...baseSettings,
      "graph.metric_selector.enabled": false,
    };
    expect(getMetricSelectorState(createSeries(disabled), disabled)).toBeNull();
    const unset: VisualizationSettings = {
      "graph.dimensions": ["CREATED_AT"],
      "graph.metrics": ["sum", "count", "avg"],
    };
    expect(getMetricSelectorState(createSeries(unset), unset)).toBeNull();
  });

  it("RF-2 returns null with a single metric", () => {
    const settings = { ...baseSettings, "graph.metrics": ["sum"] };
    expect(getMetricSelectorState(createSeries(settings), settings)).toBeNull();
  });

  it("RF-2 returns null with a breakout (more than one dimension)", () => {
    const settings = {
      ...baseSettings,
      "graph.dimensions": ["CREATED_AT", "CATEGORY"],
    };
    expect(getMetricSelectorState(createSeries(settings), settings)).toBeNull();
  });

  it("RF-2 returns null with added series", () => {
    const series = [...createSeries(), ...createSeries()];
    expect(getMetricSelectorState(series, baseSettings)).toBeNull();
  });

  it("RF-9 returns null with fewer than two included metrics", () => {
    const settings = {
      ...baseSettings,
      "graph.metric_selector.metrics": [
        { key: "sum", enabled: true },
        { key: "count", enabled: false },
        { key: "avg", enabled: false },
      ],
    };
    expect(getMetricSelectorState(createSeries(settings), settings)).toBeNull();
  });

  it("RF-6 includes every metric in graph order by default", () => {
    expect(
      getMetricSelectorState(createSeries(), baseSettings)?.metrics.map(
        (metric) => metric.key,
      ),
    ).toEqual(["sum", "count", "avg"]);
  });

  it("RF-6 keeps the configured order and skips unchecked metrics", () => {
    const settings = {
      ...baseSettings,
      "graph.metric_selector.metrics": [
        { key: "avg", enabled: true },
        { key: "count", enabled: false },
        { key: "sum", enabled: true },
      ],
    };
    expect(
      getMetricSelectorState(createSeries(settings), settings)?.metrics.map(
        (metric) => metric.key,
      ),
    ).toEqual(["avg", "sum"]);
  });

  it("RF-8 labels a metric with series_settings[key].title when present", () => {
    const settings = {
      ...baseSettings,
      series_settings: { sum: { title: "Revenue" } },
    };
    expect(
      getMetricSelectorState(createSeries(settings), settings)?.metrics[0],
    ).toEqual({ key: "sum", label: "Revenue" });
  });

  it("RF-8 labels a metric with the column display name without a title", () => {
    expect(
      getMetricSelectorState(createSeries(), baseSettings)?.metrics,
    ).toEqual([
      { key: "sum", label: "Sum of Total" },
      { key: "count", label: "Count" },
      { key: "avg", label: "Average of Total" },
    ]);
  });

  it("RF-11 uses the configured default when it is included", () => {
    const settings = {
      ...baseSettings,
      "graph.metric_selector.default": "count",
    };
    expect(
      getMetricSelectorState(createSeries(settings), settings)?.defaultKey,
    ).toBe("count");
  });

  it("RF-11 falls back to the first included metric when the default is missing", () => {
    const settings = {
      ...baseSettings,
      "graph.metric_selector.metrics": [
        { key: "sum", enabled: false },
        { key: "count", enabled: true },
        { key: "avg", enabled: true },
      ],
      "graph.metric_selector.default": "sum",
    };
    expect(
      getMetricSelectorState(createSeries(settings), settings)?.defaultKey,
    ).toBe("count");
    expect(
      getMetricSelectorState(createSeries(), baseSettings)?.defaultKey,
    ).toBe("sum");
  });

  it("RF-22 ignores metrics that no longer exist in the result", () => {
    const settings = {
      ...baseSettings,
      "graph.metrics": ["sum", "gone", "count"],
      "graph.metric_selector.metrics": [
        { key: "gone", enabled: true },
        { key: "count", enabled: true },
        { key: "sum", enabled: true },
      ],
      "graph.metric_selector.default": "gone",
    };
    expect(getMetricSelectorState(createSeries(settings), settings)).toEqual({
      metrics: [
        { key: "count", label: "Count" },
        { key: "sum", label: "Sum of Total" },
      ],
      defaultKey: "count",
    });
  });

  it("RF-22 returns null when fewer than two configured metrics still exist", () => {
    const settings = { ...baseSettings, "graph.metrics": ["sum", "gone"] };
    expect(getMetricSelectorState(createSeries(settings), settings)).toBeNull();
  });
});

describe("selectMetric", () => {
  it("RF-14 plots only the selected metric", () => {
    expect(
      selectMetric(createSeries(), "count")[0].card.visualization_settings[
        "graph.metrics"
      ],
    ).toEqual(["count"]);
  });

  it("RF-14 keeps graph.dimensions, cols and rows by reference", () => {
    const series = createSeries();
    const selected = selectMetric(series, "count");
    expect(selected).not.toBe(series);
    expect(selected[0].card.visualization_settings["graph.dimensions"]).toBe(
      series[0].card.visualization_settings["graph.dimensions"],
    );
    expect(selected[0].data.cols).toBe(series[0].data.cols);
    expect(selected[0].data.rows).toBe(series[0].data.rows);
  });

  it("RF-13 does not touch the original series or its data", () => {
    const series = createSeries();
    selectMetric(series, "count");
    expect(series[0].card.visualization_settings["graph.metrics"]).toEqual([
      "sum",
      "count",
      "avg",
    ]);
  });

  it("RF-22 returns the same reference for a key that is not a metric", () => {
    const series = createSeries();
    expect(selectMetric(series, "gone")).toBe(series);
    expect(selectMetric(series, "CREATED_AT")).toBe(series);
  });
});

describe("resolveSelectedKey", () => {
  const state: MetricSelectorState = {
    metrics: [
      { key: "sum", label: "Sum of Total" },
      { key: "count", label: "Count" },
    ],
    defaultKey: "sum",
  };

  it("RF-11 keeps a key that is still offered", () => {
    expect(resolveSelectedKey(state, "count")).toBe("count");
  });

  it("RF-19 falls back to the default when the key disappeared", () => {
    expect(resolveSelectedKey(state, "avg")).toBe("sum");
  });

  it("RF-11 falls back to the default when there is no key", () => {
    expect(resolveSelectedKey(state, undefined)).toBe("sum");
    expect(resolveSelectedKey(state, null)).toBe("sum");
    expect(resolveSelectedKey(state, "")).toBe("sum");
  });
});
