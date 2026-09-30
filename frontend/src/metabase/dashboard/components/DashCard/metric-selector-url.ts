// Fork (spec 001): the `metric_selector` URL param, `<dashcard id>:<metric key>` pairs
// separated by commas. Pure string functions; no React, no browser.

const PARAM = "metric_selector";
const PAIR_SEPARATOR = ",";
const KEY_SEPARATOR = ":";

/** Reads the pairs of `search`; malformed pairs are skipped. */
export function parseMetricSelectorParam(
  search: string,
): Record<number, string> {
  const value = new URLSearchParams(search).get(PARAM) ?? "";
  const result: Record<number, string> = {};
  for (const pair of value.split(PAIR_SEPARATOR)) {
    const separatorIndex = pair.indexOf(KEY_SEPARATOR);
    if (separatorIndex === -1) {
      continue;
    }
    const id = pair.slice(0, separatorIndex);
    const key = pair.slice(separatorIndex + 1);
    if (!/^-?\d+$/.test(id) || key === "") {
      continue;
    }
    try {
      result[Number(id)] = decodeURIComponent(key);
    } catch {
      // a broken percent-encoding is a malformed pair
    }
  }
  return result;
}

/**
 * Sets (or, with `key` null, removes) the pair of `dashcardId` and returns the
 * new query string. The other params are kept; the param goes away when no pair
 * is left, and the result is "" when no param is left.
 */
export function writeMetricSelectorParam(
  search: string,
  dashcardId: number,
  key: string | null,
): string {
  const pairs = parseMetricSelectorParam(search);
  if (key === null) {
    delete pairs[dashcardId];
  } else {
    pairs[dashcardId] = key;
  }

  const params = new URLSearchParams(search);
  const entries = Object.entries(pairs);
  if (entries.length === 0) {
    params.delete(PARAM);
  } else {
    params.set(
      PARAM,
      entries
        .map(([id, value]) => id + KEY_SEPARATOR + encodeURIComponent(value))
        .join(PAIR_SEPARATOR),
    );
  }

  const query = params.toString();
  return query === "" ? "" : "?" + query;
}
