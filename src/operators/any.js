/* @flow */
import { Match, Empty, Skip, Fault } from "../results";
import { FunctionalSchema } from "../schema";
import { Seq } from "lazily";
import { parse } from "../utils";

import type { ContextType, RawSchemaParamsType, TaskType } from "../types";

export function any(schemas, params) {
  const meta = { type: "any", schemas, params };

  function fn(obj, key, parents, parentKeys) {
    return [
      {
        task: context =>
          (function run(schemas: Array<Schema<any>>, nonMatching: Array<Schema<any>>) {
            const result = parse(schemas[0])(obj, key, parents, parentKeys)(context);
            return result instanceof Match || result instanceof Fault
              ? result
              : schemas.length > 1
                  ? run(schemas.slice(1), nonMatching.concat(schemas[0]))
                  : new Skip(
                      "None of the items matched.",
                      {
                        obj,
                        key,
                        parents,
                        parentKeys,
                        nonMatching: nonMatching.concat(schemas[0])
                      },
                      meta
                    );
          })(schemas, [])
      }
    ];
  }

  return new FunctionalSchema(fn, params, meta);
}
