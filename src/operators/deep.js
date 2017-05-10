/* @flow */
import { Seq } from "lazily";
import { Match, Empty, Skip, Fault } from "../results";
import { OperatorSchema } from "../schema";
import { parse } from "../utils";

export function deep(schema, params) {
  const meta = { type: "deep", schema, params };

  function fn(obj, key, parents, parentKeys) {
    return context => {
      function traverseObject(keys) {
        return keys.length
          ? (() => {
              const result = parse(deep(schema))(
                obj[keys[0]],
                key,
                parents.concat(obj),
                parentKeys.concat(keys[0])
              )(context);
              return !(result instanceof Skip) ? result : traverseObject(keys.slice(1));
            })()
          : new Skip("Not found in deep.", { obj, key, parents, parentKeys }, meta);
      }

      function traverseArray(items) {
        return items.length
          ? (() => {
              const result = parse(deep(schema, params))(items[0], key, parents, parentKeys)(
                context
              );
              return !(result instanceof Skip) ? result : traverseArray(items.slice(1));
            })()
          : new Skip("Not found in deep.", { obj, key, parents, parentKeys }, meta);
      }

      const result = parse(schema)(obj, key, parents, parentKeys)(context);

      return !(result instanceof Skip)
        ? result
        : typeof obj === "object"
            ? traverseObject(Object.keys(obj))
            : Array.isArray(obj)
                ? traverseArray(obj)
                : new Skip("Not found in deep.", { obj, key, parents, parentKeys }, meta);
    };
  }

  return new OperatorSchema(fn, params, meta);
}
