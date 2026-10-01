import { registerVisualizations } from "metabase/visualizations/register";
import {
  getSettingsWidgetsForSeries,
  getVisualizationTransformed,
} from "metabase/viz-core";
import type {
  VisualizationDisplay,
  VisualizationSettings,
} from "metabase-types/api";
import {
  createMockCard,
  createMockColumn,
  createMockDatasetData,
  createMockSingleSeries,
} from "metabase-types/api/mocks";

registerVisualizations();

const COLS = [
  createMockColumn({
    name: "CREATED_AT",
    display_name: "Created At",
    base_type: "type/DateTime",
    semantic_type: null,
  }),
  createMockColumn({
    name: "CATEGORY",
    display_name: "Category",
    base_type: "type/Text",
    semantic_type: "type/Category",
  }),
  createMockColumn({
    name: "sum",
    display_name: "Sum of Total",
    base_type: "type/Number",
    semantic_type: null,
  }),
  createMockColumn({
    name: "count",
    display_name: "Count",
    base_type: "type/Number",
    semantic_type: null,
  }),
  createMockColumn({
    name: "avg",
    display_name: "Average of Total",
    base_type: "type/Number",
    semantic_type: null,
  }),
];
const ROWS = [
  ["2026-01-01", "A", 10, 1, 10],
  ["2026-02-01", "B", 30, 2, 15],
];

const BASE_SETTINGS: VisualizationSettings = {
  "graph.dimensions": ["CREATED_AT"],
  "graph.metrics": ["sum", "count", "avg"],
};
const ENABLED_SETTINGS: VisualizationSettings = {
  ...BASE_SETTINGS,
  "graph.metric_selector.enabled": true,
};

interface SetupOpts {
  settings?: VisualizationSettings;
  display?: VisualizationDisplay;
  isDashboard?: boolean;
  cardCount?: number;
}

const setup = ({
  settings = ENABLED_SETTINGS,
  display = "line",
  isDashboard = true,
  cardCount = 1,
}: SetupOpts = {}) => {
  const rawSeries = Array.from({ length: cardCount }, (_item, index) =>
    createMockSingleSeries(
      createMockCard({
        id: index + 1,
        display,
        visualization_settings: settings,
      }),
      { data: createMockDatasetData({ cols: COLS, rows: ROWS }) },
    ),
  );
  // The sidebar is handed the transformed series, as it is in the app.
  const { series } = getVisualizationTransformed(rawSeries);
  const widgets = getSettingsWidgetsForSeries(series, jest.fn(), isDashboard);
  const findWidget = (id: string) => widgets.find((widget) => widget.id === id);

  return {
    enabled: findWidget("graph.metric_selector.enabled"),
    metrics: findWidget("graph.metric_selector.metrics"),
    defaultMetric: findWidget("graph.metric_selector.default"),
  };
};

describe("metric selector settings", () => {
  describe("graph.metric_selector.enabled", () => {
    it("RF-1 is offered on a dashboard card with one question, no breakout and several metrics", () => {
      const { enabled } = setup({ settings: BASE_SETTINGS });

      expect(enabled).toMatchObject({
        title: "Metric selector",
        hidden: false,
        value: false,
      });
    });

    it("RF-1 is not offered outside a dashboard", () => {
      const { enabled, metrics, defaultMetric } = setup({ isDashboard: false });

      expect(enabled).toBeUndefined();
      expect(metrics).toBeUndefined();
      expect(defaultMetric).toBeUndefined();
    });

    it("RF-1 is hidden with a single metric", () => {
      const { enabled } = setup({
        settings: { ...BASE_SETTINGS, "graph.metrics": ["sum"] },
      });

      expect(enabled?.hidden).toBe(true);
    });

    it("RF-1 is not offered on charts that are not line, area, bar or combo", () => {
      expect(setup({ display: "waterfall" }).enabled).toBeUndefined();
      expect(setup({ display: "table" }).enabled).toBeUndefined();
    });

    it("RF-2 is hidden with a breakout", () => {
      const { enabled } = setup({
        settings: {
          ...BASE_SETTINGS,
          "graph.dimensions": ["CREATED_AT", "CATEGORY"],
          "graph.metrics": ["sum", "count"],
        },
      });

      expect(enabled?.hidden).toBe(true);
    });

    it("RF-2 is hidden with added series", () => {
      const { enabled } = setup({ settings: BASE_SETTINGS, cardCount: 2 });

      expect(enabled?.hidden).toBe(true);
    });
  });

  describe("graph.metric_selector.metrics", () => {
    it("RF-5 is hidden, like the initial metric, while the selector is disabled", () => {
      const { metrics, defaultMetric } = setup({ settings: BASE_SETTINGS });

      expect(metrics?.hidden).toBe(true);
      expect(defaultMetric?.hidden).toBe(true);
    });

    it("RF-5 is shown, like the initial metric, once the selector is enabled", () => {
      const { metrics, defaultMetric } = setup();

      expect(metrics).toMatchObject({
        title: "Included metrics",
        hidden: false,
      });
      expect(defaultMetric).toMatchObject({
        title: "Initial metric",
        hidden: false,
      });
    });

    it("RF-6 includes every metric in graph order by default", () => {
      const { metrics } = setup();

      expect(metrics?.value).toEqual([
        { key: "sum", enabled: true },
        { key: "count", enabled: true },
        { key: "avg", enabled: true },
      ]);
    });

    it("RF-5 hands the widget the visible name of each metric", () => {
      const { metrics } = setup({
        settings: {
          ...ENABLED_SETTINGS,
          series_settings: { sum: { title: "Revenue" } },
        },
      });

      expect(metrics?.props).toEqual({
        metricNames: {
          sum: "Revenue",
          count: "Count",
          avg: "Average of Total",
        },
      });
    });

    it("RF-22 drops a stored metric that is no longer plotted", () => {
      const { metrics } = setup({
        settings: {
          ...ENABLED_SETTINGS,
          "graph.metrics": ["sum", "count"],
          "graph.metric_selector.metrics": [
            { key: "avg", enabled: true },
            { key: "count", enabled: false },
            { key: "sum", enabled: true },
          ],
        },
      });

      expect(metrics?.value).toEqual([
        { key: "count", enabled: false },
        { key: "sum", enabled: true },
      ]);
    });

    it("RF-5 RF-6 appends a new metric as included and keeps the stored order of the rest", () => {
      const { metrics } = setup({
        settings: {
          ...ENABLED_SETTINGS,
          "graph.metric_selector.metrics": [
            { key: "count", enabled: false },
            { key: "sum", enabled: true },
          ],
        },
      });

      expect(metrics?.value).toEqual([
        { key: "count", enabled: false },
        { key: "sum", enabled: true },
        { key: "avg", enabled: true },
      ]);
    });
  });

  describe("graph.metric_selector.default", () => {
    it("RF-7 defaults to the first included metric", () => {
      expect(setup().defaultMetric?.value).toBe("sum");

      const { defaultMetric } = setup({
        settings: {
          ...ENABLED_SETTINGS,
          "graph.metric_selector.metrics": [
            { key: "avg", enabled: false },
            { key: "count", enabled: true },
            { key: "sum", enabled: true },
          ],
        },
      });

      expect(defaultMetric?.value).toBe("count");
    });

    it("RF-7 keeps a stored initial metric that is included", () => {
      const { defaultMetric } = setup({
        settings: {
          ...ENABLED_SETTINGS,
          "graph.metric_selector.default": "avg",
        },
      });

      expect(defaultMetric?.value).toBe("avg");
    });

    it("RF-7 only offers the included metrics, with their visible names", () => {
      const { defaultMetric } = setup({
        settings: {
          ...ENABLED_SETTINGS,
          series_settings: { sum: { title: "Revenue" } },
          "graph.metric_selector.metrics": [
            { key: "avg", enabled: true },
            { key: "count", enabled: false },
            { key: "sum", enabled: true },
          ],
        },
      });

      expect(defaultMetric?.props).toEqual({
        options: [
          { name: "Average of Total", value: "avg" },
          { name: "Revenue", value: "sum" },
        ],
      });
    });

    it("RF-7 falls back to the first included metric when the stored one is no longer included", () => {
      const { defaultMetric } = setup({
        settings: {
          ...ENABLED_SETTINGS,
          "graph.metric_selector.metrics": [
            { key: "sum", enabled: true },
            { key: "count", enabled: false },
            { key: "avg", enabled: true },
          ],
          "graph.metric_selector.default": "count",
        },
      });

      expect(defaultMetric?.value).toBe("sum");
    });
  });
});
