/* @flow */
import { Seq } from "lazily";
import { traverse } from "../traverse";
import { Result, Match, Empty, Skip, Fault } from "../results";
import Schema from "../schema";

import type {
  ContextType,
  ArraySchemaType,
  RawSchemaParamsType,
  SchemaParamsType,
  ResultGeneratorType,
  EnvType,
  MetaType
} from "../types";

export default function(schema: ArraySchemaType, params: SchemaParamsType, inner: boolean) {
  return function(originalObj: any, context: ContextType, key: string, parents: Array<any>, parentKeys: Array<string>) {
    return function(obj: any, meta: MetaType) {
      function getChildTasks() {
        return Array.isArray(obj)
          ? schema.length !== obj.length
              ? new Skip(
                  `Expected array of length ${schema.length} but got ${obj.length}.`,
                  { obj, context, key, parents, parentKeys },
                  meta
                )
              : Seq.of(schema)
                  .map((rhs, i) => ({
                    task: traverse(
                      rhs,
                      {
                        value: params.value,
                        modifiers: {
                          property: params.modifiers.property,
                          value: params.modifiers.value
                        }
                      },
                      false
                    ).fn(
                      obj[i],
                      { parent: context },
                      `${key}.${i}`,
                      parents.concat(originalObj),
                      parentKeys.concat(key)
                    ),
                    params: schema.params
                  }))
                  .toArray()
          : [
              new Skip(
                `Schema is an array but property is a non-array.`,
                { obj, context, key, parents, parentKeys },
                meta
              )
            ];
      }

      /*
      Array child tasks will always return an array.
    */
      function mergeChildTasks(finished: { result: Result, params: SchemaParamsType }) {
        return Seq.of(finished).reduce(
          (acc, { result, params }) => {
            return result instanceof Match
              ? !(result instanceof Empty)
                  ? Object.assign(acc, {
                      state: (acc.state || []).concat([result.value])
                    })
                  : acc
              : { nonMatch: result };
          },
          context,
          (acc, { result }) => !(result instanceof Match)
        );
      }

      return { getChildTasks, mergeChildTasks };
    };
  };
}