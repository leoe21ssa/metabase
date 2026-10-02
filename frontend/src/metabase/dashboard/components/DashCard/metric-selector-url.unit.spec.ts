import {
  parseMetricSelectorParam,
  writeMetricSelectorParam,
} from "./metric-selector-url";

describe("parseMetricSelectorParam", () => {
  it("RF-26 reads one pair", () => {
    expect(parseMetricSelectorParam("?metric_selector=12:count")).toEqual({
      12: "count",
    });
  });

  it("RF-26 reads several pairs", () => {
    expect(
      parseMetricSelectorParam("?tab=3&metric_selector=12:count,15:sum"),
    ).toEqual({ 12: "count", 15: "sum" });
  });

  it("RF-27 returns an empty object without the param or with an empty value", () => {
    expect(parseMetricSelectorParam("")).toEqual({});
    expect(parseMetricSelectorParam("?tab=3")).toEqual({});
    expect(parseMetricSelectorParam("?metric_selector=")).toEqual({});
  });

  it("RF-27 skips malformed pairs and keeps the valid ones", () => {
    expect(
      parseMetricSelectorParam(
        "?metric_selector=abc:count,12,15:,:sum,1.5:avg,%E0:x,12:count",
      ),
    ).toEqual({ 12: "count" });
    expect(parseMetricSelectorParam("?metric_selector=12:%25E0")).toEqual({});
  });

  it("RF-26 decodes keys with commas and colons", () => {
    const search = writeMetricSelectorParam("", 12, "a,b:c");
    expect(parseMetricSelectorParam(search)).toEqual({ 12: "a,b:c" });
  });
});

describe("writeMetricSelectorParam", () => {
  it("RF-20 writes a new pair", () => {
    const search = writeMetricSelectorParam("", 12, "count");
    expect(search.startsWith("?metric_selector=")).toBe(true);
    expect(parseMetricSelectorParam(search)).toEqual({ 12: "count" });
  });

  it("RF-20 adds a pair next to an existing one", () => {
    const search = writeMetricSelectorParam(
      "?metric_selector=12:count",
      15,
      "sum",
    );
    expect(parseMetricSelectorParam(search)).toEqual({
      12: "count",
      15: "sum",
    });
  });

  it("RF-20 replaces the pair of the same dashcard", () => {
    const search = writeMetricSelectorParam(
      "?metric_selector=12:count,15:sum",
      12,
      "avg",
    );
    expect(parseMetricSelectorParam(search)).toEqual({ 12: "avg", 15: "sum" });
  });

  it("RF-20 removes the pair with a null key", () => {
    const search = writeMetricSelectorParam(
      "?metric_selector=12:count,15:sum",
      12,
      null,
    );
    expect(parseMetricSelectorParam(search)).toEqual({ 15: "sum" });
  });

  it("RF-20 removes the param when no pair is left", () => {
    expect(
      writeMetricSelectorParam("?metric_selector=12:count", 12, null),
    ).toBe("");
    expect(
      parseMetricSelectorParam(
        writeMetricSelectorParam("?metric_selector=12:count", 99, null),
      ),
    ).toEqual({ 12: "count" });
    expect(writeMetricSelectorParam("", 12, null)).toBe("");
  });

  it("RF-20 keeps the other params of the query string", () => {
    expect(
      writeMetricSelectorParam("?tab=3&metric_selector=12:count&x=y", 12, null),
    ).toBe("?tab=3&x=y");
    expect(writeMetricSelectorParam("?tab=3", 12, "count")).toBe(
      "?tab=3&metric_selector=12%3Acount",
    );
  });

  it("RF-26 round-trips keys with commas, colons and percent signs", () => {
    const search = writeMetricSelectorParam("", 12, "100%,a:b");
    expect(parseMetricSelectorParam(search)).toEqual({ 12: "100%,a:b" });
  });
});
