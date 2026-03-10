const COLOR_MIX_FALLBACK_RE =
  /^color-mix\(\s*in\s+(oklab|oklch)\s*,\s*var\((--[\w-]+)\)\s*([\d.]+)%\s*,\s*transparent\s*\)$/;

function toRgbVarName(colorVarName) {
  if (colorVarName.startsWith('--color-')) {
    return `${colorVarName}-rgb`;
  }

  return `--color-${colorVarName.slice(2)}-rgb`;
}

function toFallbackValue(colorVarName, pct) {
  const alpha = parseFloat((Number(pct) / 100).toFixed(4));
  const rgbVarName = toRgbVarName(colorVarName);
  return `rgba(var(${rgbVarName}, 0, 0, 0), ${alpha})`;
}

function setFallbackDecl(rule, decl, fallbackValue) {
  const existingDecl = rule.nodes.find((node) => node.type === 'decl' && node.prop === decl.prop);

  if (existingDecl) {
    existingDecl.value = fallbackValue;
    return;
  }

  rule.prepend({ prop: decl.prop, value: fallbackValue });
}

function findOuterRule(atRule, selector) {
  let sibling = atRule.prev();

  while (sibling) {
    if (sibling.type === 'rule' && sibling.selector === selector) {
      return sibling;
    }

    if (sibling.type !== 'comment') {
      break;
    }

    sibling = sibling.prev();
  }

  return null;
}

function ensureFallbackDecl(atRule, innerRule, decl, fallbackValue) {
  const outerRule = findOuterRule(atRule, innerRule.selector);

  if (outerRule) {
    setFallbackDecl(outerRule, decl, fallbackValue);
    return;
  }

  const fallbackRule = innerRule.clone({ nodes: [] });
  fallbackRule.append({ prop: decl.prop, value: fallbackValue });
  atRule.parent.insertBefore(atRule, fallbackRule);
}

function fixOklch() {
  return {
    postcssPlugin: 'postcss-fix-oklch',
    OnceExit(root) {
      root.walkAtRules('supports', (atRule) => {
        if (!atRule.params.includes('color-mix(')) return;

        if (atRule.parent?.type === 'rule') {
          const outerRule = atRule.parent;

          atRule.walkDecls((decl) => {
            const match = decl.value.match(COLOR_MIX_FALLBACK_RE);
            if (!match) return;

            const [, , colorVarName, pct] = match;
            setFallbackDecl(outerRule, decl, toFallbackValue(colorVarName, pct));
          });

          return;
        }

        atRule.walkRules((innerRule) => {
          innerRule.walkDecls((decl) => {
            const match = decl.value.match(COLOR_MIX_FALLBACK_RE);
            if (!match) return;

            const [, , colorVarName, pct] = match;
            ensureFallbackDecl(atRule, innerRule, decl, toFallbackValue(colorVarName, pct));
          });
        });
      });
    },
  };
}

fixOklch.postcss = true;

module.exports = fixOklch;
