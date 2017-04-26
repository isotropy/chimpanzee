/* @flow */
import external from "./external";
import { Match, Empty, Skip, Fault } from "../results";
import Schema from "../schema";

import type {
  ContextType,
  SchemaType,
  RawSchemaParamsType,
  SchemaParamsType,
  ResultGeneratorType,
  EnvType,
  MetaType
} from "../types";

export default function(schema: Schema, params: SchemaParamsType) {
  return function(
    originalObj: any,
    context: ContextType,
    key: string,
    parents: Array<any>,
    parentKeys: Array<string>
  ) {
    return function(obj: any, meta: MetaType) {
      function getChildTasks() {
        return [
          {
            task: schema.fn(obj, context, key, parents, parentKeys),
            type: "schema",
            params: schema.params
          }
        ];
      }

      const common = external(schema, params)(
        originalObj,
        context,
        key,
        parents,
        parentKeys
      )(obj, meta);

      return { getChildTasks, mergeChildResult: common.mergeChildResult };
    };
  };
}
