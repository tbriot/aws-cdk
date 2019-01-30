import jsiiReflect = require('jsii-reflect');
import { definitionOf, extendsType, schemaForTypeReference } from '../lib/jsii2schema';
import { loadTypeSystem } from '../lib/type-system';

// tslint:disable:no-console

async function main() {
  const typeSystem = await loadTypeSystem();

  // Find all constructs for which the props interface
  // (transitively) only consists of JSON primitives or interfaces
  // that consist of JSON primitives
  const constructType = typeSystem.findClass('@aws-cdk/cdk.Construct');
  const constructs = typeSystem.classes.filter(c => extendsType(c, constructType));

  const deconstructs = constructs
    .map(unpackConstruct)
    .filter(c => c && !isCfnResource(c.constructClass)) as ConstructAndProps[];

  const baseSchema = require('../cloudformation.schema.json');

  const definitions = baseSchema.definitions || { };

  for (const deco of deconstructs) {
    const resource = schemaForResource(deco, definitions);
    if (resource) {
      baseSchema.properties.Resources.patternProperties["^[a-zA-Z0-9]+$"].anyOf.push(resource);
    }
  }

  baseSchema.properties.$schema = {
    type: 'string'
  };

  process.stdout.write(JSON.stringify(baseSchema, undefined, 2));
}

export function schemaForResource(construct: ConstructAndProps, definitions: { [fqn: string]: any }) {
  return definitionOf(definitions, construct.constructClass.fqn, () => {
    const propsSchema = schemaForTypeReference(construct.propsTypeRef, definitions);
    if (!propsSchema) {
      return undefined;
    }

    return {
      additionalProperties: false,
      properties: {
        Properties: propsSchema,
        Type: {
          enum: [ construct.constructClass.fqn ],
          type: "string"
        }
      }
    };
  });
}

function isCfnResource(klass: jsiiReflect.ClassType) {
  const resource = klass.system.findClass('@aws-cdk/cdk.Resource');
  return extendsType(klass, resource);
}

function unpackConstruct(klass: jsiiReflect.ClassType): ConstructAndProps | undefined {

  if (!klass.initializer || klass.abstract) { return undefined; }
  if (klass.initializer.parameters.length < 3) { return undefined; }

  const propsParam = klass.initializer.parameters[2];
  if (propsParam.type.fqn === undefined) { return undefined; }

  return {
    constructClass: klass,
    propsTypeRef: klass.initializer.parameters[2].type
  };
}

export interface ConstructAndProps {
  constructClass: jsiiReflect.ClassType;
  propsTypeRef: jsiiReflect.TypeReference;
}

main().catch(e => {
  // tslint:disable-next-line:no-console
  console.error(e);
  process.exit(1);
});