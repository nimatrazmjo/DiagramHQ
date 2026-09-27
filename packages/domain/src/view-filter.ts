/**
 * Dynamic View Filtering Engine (F035).
 * Evaluates live filtered projections over architecture model objects.
 */

export interface ViewFilter {
  team?: string;
  technology?: string;
  environment?: string;
  domain?: string;
  owner?: string;
  status?: string;
  tag?: string;
  tags?: string[] | string;
  criticality?: string;
  'data-classification'?: string;
  dataClassification?: string;
  cloud?: string;
  region?: string;
  repository?: string;
  kind?: string;
  [key: string]: unknown;
}

export interface FilterableObject {
  id: string;
  name: string;
  kind: string;
  parentId?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function matchesSingleOrArray(actual: unknown, expected: string): boolean {
  if (actual === null || actual === undefined) return false;
  const target = normalize(expected);
  if (!target) return true;

  if (Array.isArray(actual)) {
    return actual.some((item) => normalize(item) === target || normalize(item).includes(target));
  }

  const str = normalize(actual);
  return str === target || str.includes(target);
}

/**
 * Checks whether a model object satisfies a dynamic view filter.
 */
export function matchesViewFilter(
  object: FilterableObject,
  filter?: ViewFilter | null,
): boolean {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  const meta = object.metadata || {};

  for (const [key, rawValue] of Object.entries(filter)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }
    const expected = String(rawValue);

    switch (key) {
      case 'team': {
        const actual = meta.team;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'technologyLifecycle': {
        let isMatch = false;
        if (Array.isArray(meta.technologies)) {
          for (const tech of meta.technologies) {
            if (typeof tech === 'object' && tech !== null && 'lifecycle' in tech) {
              if (matchesSingleOrArray(tech.lifecycle, expected)) {
                isMatch = true;
                break;
              }
            }
          }
        }
        if (!isMatch) return false;
        break;
      }

      case 'technology': {
        let isMatch = false;
        if (matchesSingleOrArray(meta.technology, expected)) {
          isMatch = true;
        } else if (Array.isArray(meta.technologies)) {
          for (const tech of meta.technologies) {
            if (typeof tech === 'string' && matchesSingleOrArray(tech, expected)) {
              isMatch = true;
              break;
            } else if (typeof tech === 'object' && tech !== null && 'name' in tech) {
              if (matchesSingleOrArray(tech.name, expected)) {
                isMatch = true;
                break;
              }
            }
          }
        }
        if (!isMatch) return false;
        break;
      }

      case 'environment': {
        const actual = meta.environment;
        // If object applies to 'all' environments, it matches any specific environment filter
        if (normalize(actual) === 'all') break;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'domain': {
        const actual = meta.domain;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'owner': {
        const actual = meta.owner;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'status': {
        const actual = meta.status ?? meta.lifecycle;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'tag':
      case 'tags': {
        const actual = meta.tags ?? meta.tag;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'criticality': {
        const actual = meta.criticality;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'data-classification':
      case 'dataClassification': {
        const actual = meta['data-classification'] ?? meta.dataClassification;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'cloud': {
        const actual = meta.cloud;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'region': {
        const actual = meta.region;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      case 'repository': {
        const actual = meta.repository;
        if (typeof actual === 'object' && actual !== null) {
          const repoObj = actual as { url?: string; name?: string };
          const repVal = repoObj.url ?? repoObj.name ?? JSON.stringify(actual);
          if (!matchesSingleOrArray(repVal, expected)) return false;
        } else {
          if (!matchesSingleOrArray(actual, expected)) return false;
        }
        break;
      }

      case 'kind': {
        if (normalize(object.kind) !== normalize(expected)) return false;
        break;
      }

      case 'containerId':
      case 'parentId': {
        const actual = object.parentId ?? meta.containerId ?? meta.parentId;
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }

      default: {
        // Generic metadata field match
        const actual = meta[key];
        if (!matchesSingleOrArray(actual, expected)) return false;
        break;
      }
    }
  }

  return true;
}

/**
 * Live projection of model objects against a view filter.
 */
export function evaluateDynamicView(
  objects: FilterableObject[],
  filter?: ViewFilter | null,
): FilterableObject[] {
  if (!filter || Object.keys(filter).length === 0) {
    return objects;
  }
  return objects.filter((obj) => matchesViewFilter(obj, filter));
}
