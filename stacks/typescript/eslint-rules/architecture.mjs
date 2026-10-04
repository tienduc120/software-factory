import { dirname, resolve, sep } from 'node:path';

const LAYERS = ['contracts', 'domain', 'application', 'infrastructure', 'presentation'];

// Mirrors the dependency table in standards/architecture.md; `root` is the <context>-module.ts file.
const SAME_MODULE = {
  contracts: ['contracts'],
  domain: ['domain'],
  application: ['contracts', 'domain', 'application'],
  infrastructure: ['contracts', 'domain', 'application', 'infrastructure'],
  presentation: ['contracts', 'application', 'presentation'],
};
const OUTSIDE_MODULES = {
  contracts: ['kernel'],
  domain: ['kernel'],
  application: ['kernel'],
  infrastructure: ['kernel', 'platform'],
  presentation: ['kernel', 'platform'],
  root: ['kernel', 'platform'],
};
const CROSS_MODULE_CONSUMERS = ['infrastructure', 'root'];

/** Classifies a path under `src/` as module, kernel, platform, or other code. */
function locate(file) {
  const parts = resolve(file).split(sep);
  const src = parts.lastIndexOf('src');
  if (src === -1) return undefined;
  const [area, name, third] = parts.slice(src + 1);
  if (area === 'modules' && third !== undefined) {
    return {
      kind: 'module',
      module: name,
      layer: LAYERS.includes(third) ? third : 'root',
      rest: parts.slice(src + 3).join('/'),
    };
  }
  if (area === 'shared' && name === 'kernel') return { kind: 'kernel' };
  if (area === 'platform') return { kind: 'platform' };
  return { kind: 'other' };
}

function findProblem(from, to) {
  if (from.kind === 'kernel') {
    return to.kind === 'kernel' ? undefined : { messageId: 'kernel' };
  }
  if (from.kind === 'platform') {
    return to.kind === 'kernel' || to.kind === 'platform' ? undefined : { messageId: 'platform' };
  }
  if (from.kind !== 'module') return undefined;

  if (to.kind === 'module' && to.module !== from.module) {
    const isAllowed = to.layer === 'contracts' && CROSS_MODULE_CONSUMERS.includes(from.layer);
    return isAllowed ? undefined : { messageId: 'crossModule', data: { module: to.module } };
  }
  if (to.kind === 'module') {
    if (from.layer === 'root') return undefined;
    if (to.layer === 'root') return { messageId: 'moduleRoot', data: { file: to.rest } };
    return SAME_MODULE[from.layer].includes(to.layer)
      ? undefined
      : { messageId: 'layer', data: { from: from.layer, to: to.layer } };
  }
  return OUTSIDE_MODULES[from.layer].includes(to.kind)
    ? undefined
    : { messageId: 'outside', data: { layer: from.layer, target: to.kind } };
}

const layers = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce layer and module boundaries from standards/architecture.md' },
    schema: [],
    messages: {
      layer: '{{from}} must not import {{to}}: dependencies point inward.',
      crossModule:
        "Only infrastructure (the anti-corruption layer) and the module file may use module '{{module}}', and only its contracts/.",
      moduleRoot: 'Layer code must not import the module file {{file}}.',
      outside: '{{layer}} code must not import {{target}} code.',
      kernel: 'src/shared/kernel must not depend on code outside the kernel.',
      platform: 'src/platform is technical and must not depend on business modules.',
    },
  },
  create(context) {
    const from = locate(context.filename);
    if (!from || from.kind === 'other') return {};

    const check = (source) => {
      if (source?.type !== 'Literal' || typeof source.value !== 'string') return;
      if (!source.value.startsWith('.')) return;
      const to = locate(resolve(dirname(context.filename), source.value));
      const problem = to && findProblem(from, to);
      if (problem) context.report({ node: source, ...problem });
    };

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    };
  },
};

const PRIMITIVE_TYPES = new Set([
  'TSStringKeyword',
  'TSNumberKeyword',
  'TSBigIntKeyword',
  'TSSymbolKeyword',
]);

function containsPrimitive(type) {
  if (!type) return false;
  if (PRIMITIVE_TYPES.has(type.type)) return true;
  return type.type === 'TSUnionType' && type.types.some(containsPrimitive);
}

const entityShape = {
  meta: {
    type: 'problem',
    docs: { description: 'Entities follow the shape in standards/architecture.md' },
    schema: [],
    messages: {
      privateConstructor:
        'Entity {{name}} needs a private constructor; build it through static factories.',
      readonlyProperty: 'Entity constructor parameters must be `readonly` parameter properties.',
      primitive: 'Entity property {{property}} must be a value object, not a raw string/number.',
      restore: 'Entity {{name}} needs a static `restore` method to rebuild it from storage.',
    },
  },
  create(context) {
    const at = locate(context.filename);
    if (at?.kind !== 'module' || at.layer !== 'domain') return {};

    return {
      ClassDeclaration(node) {
        const name = node.id?.name ?? 'anonymous';
        // Domain services are injectable classes with public constructors, not entities.
        if (name.endsWith('Service')) return;
        const members = node.body.body;
        const constructor = members.find((m) => m.kind === 'constructor');
        if (constructor?.accessibility !== 'private') {
          context.report({
            node: node.id ?? node,
            messageId: 'privateConstructor',
            data: { name },
          });
        }
        for (const param of constructor?.value.params ?? []) {
          if (param.type !== 'TSParameterProperty' || !param.readonly) {
            context.report({ node: param, messageId: 'readonlyProperty' });
            continue;
          }
          if (containsPrimitive(param.parameter.typeAnnotation?.typeAnnotation)) {
            const property = param.parameter.name ?? 'parameter';
            context.report({ node: param, messageId: 'primitive', data: { property } });
          }
        }
        const hasRestore = members.some(
          (m) => m.type === 'MethodDefinition' && m.static && m.key.name === 'restore',
        );
        if (!hasRestore) {
          context.report({ node: node.id ?? node, messageId: 'restore', data: { name } });
        }
      },
    };
  },
};

const singleExecute = {
  meta: {
    type: 'problem',
    docs: { description: 'Use cases and services expose exactly one public method: execute' },
    schema: [],
    messages: {
      extraMethod: '{{name}} may expose only `execute`; make `{{method}}` private or move it.',
      missingExecute: '{{name}} must expose a public `execute` method.',
    },
  },
  create(context) {
    if (locate(context.filename)?.kind !== 'module') return {};

    return {
      ClassDeclaration(node) {
        const name = node.id?.name ?? '';
        if (!/(UseCase|Service)$/.test(name)) return;
        const publicMethods = node.body.body.filter(
          (m) =>
            m.type === 'MethodDefinition' &&
            m.kind === 'method' &&
            !m.static &&
            m.key.type !== 'PrivateIdentifier' &&
            m.accessibility !== 'private' &&
            m.accessibility !== 'protected',
        );
        for (const method of publicMethods) {
          if (method.key.name !== 'execute') {
            context.report({
              node: method.key,
              messageId: 'extraMethod',
              data: { name, method: method.key.name },
            });
          }
        }
        if (!publicMethods.some((m) => m.key.name === 'execute')) {
          context.report({ node: node.id ?? node, messageId: 'missingExecute', data: { name } });
        }
      },
    };
  },
};

export const architecture = {
  rules: { layers, 'entity-shape': entityShape, 'single-execute': singleExecute },
};
