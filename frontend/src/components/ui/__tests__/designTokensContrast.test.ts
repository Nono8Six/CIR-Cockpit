import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type Hsl = { h: number; s: number; l: number };

/** Vitest tourne avec `frontend` pour racine (voir frontend/vitest.config.ts). */
const CSS_PATH = resolve(process.cwd(), 'src/index.css');

function readRootTokens(): Record<string, Hsl> {
  const root = readFileSync(CSS_PATH, 'utf8').match(/:root\s*\{([\s\S]*?)\}/);
  if (!root) {
    throw new Error(`Bloc :root introuvable dans ${CSS_PATH}`);
  }
  const tokens: Record<string, Hsl> = {};
  const declaration = /--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/g;
  let match = declaration.exec(root[1]);
  while (match !== null) {
    tokens[match[1]] = { h: Number(match[2]), s: Number(match[3]), l: Number(match[4]) };
    match = declaration.exec(root[1]);
  }
  return tokens;
}

function relativeLuminance({ h, s, l }: Hsl): number {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  const [r, g, b] = [channel(0), channel(8), channel(4)].map((value) => {
    const srgb = Math.round(value * 255) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: Hsl, b: Hsl): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const tokens = readRootTokens();

function token(name: string): Hsl {
  const value = tokens[name];
  if (!value) {
    throw new Error(`Token --${name} absent du bloc :root de frontend/src/index.css`);
  }
  return value;
}

/** Fonds sur lesquels un token de texte peut reellement etre pose. */
const SURFACES = ['background', 'card', 'surface-1', 'surface-2'] as const;

/** Seuil AA texte normal. Le produit descend jusqu'a 10px: le seuil 3:1 "grand texte" ne s'applique jamais. */
const AA_TEXT = 4.5;

/** Seuil WCAG 1.4.11 pour les bordures de controles. */
const AA_NON_TEXT = 3;

/**
 * Dette assumee, arbitree par le PO le 28/07/2026 (T1.3) : ces tokens ne peuvent pas
 * atteindre leur seuil sans detruire l'identite visuelle, verifie en navigateur.
 * `warning` a 4,5:1 vire au brun (#916512 au lieu de l'ambre #de9a1b) — d'ou
 * `warning-strong`, reserve au texte. `border` alimente le `* { border-color }`
 * global : a 3:1 chaque filet de table devient un trait gris franc. `input` a subi
 * le meme rejet sur les boutons `outline`. Suivi dans
 * docs/UI_UX/plan-refonte-ui.md (T1.3), pas silencieusement oublie : le test
 * ci-dessous echoue si un ratio bouge sans decision.
 */
const KNOWN_BELOW_THRESHOLD: Record<string, number> = {
  warning: 2.22,
  border: 1.21,
  input: 1.21,
  'border-subtle': 1.03,
};

/** Fond reel des badges `bg-warning/10 text-warning-strong` : 10 % d'ambre sur `card`. */
function warningTint(): Hsl {
  const warning = token('warning');
  const card = token('card');
  return {
    h: warning.h,
    s: warning.s * 0.1 + card.s * 0.9,
    l: warning.l * 0.1 + card.l * 0.9,
  };
}

describe('tokens de couleur — contraste WCAG', () => {
  it.each(['destructive', 'success', 'muted-foreground', 'warning-strong'])(
    '--%s atteint 4,5:1 sur les quatre fonds',
    (name) => {
      for (const surface of SURFACES) {
        expect(
          contrastRatio(token(name), token(surface)),
          `--${name} sur --${surface}`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    },
  );

  it('--warning-strong atteint 4,5:1 sur le fond teinte des badges warning', () => {
    expect(contrastRatio(token('warning-strong'), warningTint())).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('--ring atteint 3:1 sur les quatre fonds', () => {
    for (const surface of SURFACES) {
      expect(
        contrastRatio(token('ring'), token(surface)),
        `--ring sur --${surface}`,
      ).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
  });

  it.each(Object.entries(KNOWN_BELOW_THRESHOLD))(
    '--%s reste sur sa valeur de dette connue (pire fond)',
    (name, expected) => {
      const worst = Math.min(...SURFACES.map((s) => contrastRatio(token(name), token(s))));
      expect(worst, `--${name} : dette T1.3, toute evolution demande une decision PO`).toBeCloseTo(
        expected,
        2,
      );
    },
  );

  it.each([
    ['primary-foreground', 'primary'],
    ['destructive-foreground', 'destructive'],
    ['warning-foreground', 'warning'],
    ['success-foreground', 'success'],
    ['accent-foreground', 'accent'],
    ['secondary-foreground', 'secondary'],
    ['card-foreground', 'card'],
    ['popover-foreground', 'popover'],
  ])('--%s atteint 4,5:1 sur --%s', (foreground, background) => {
    expect(contrastRatio(token(foreground), token(background))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('garde la palette chaude et le rouge de marque', () => {
    for (const name of ['background', 'surface-1', 'surface-2', 'surface-3', 'border', 'border-subtle', 'muted-foreground', 'warning', 'warning-strong']) {
      const { h } = token(name);
      expect(h, `--${name}`).toBeGreaterThanOrEqual(30);
      expect(h, `--${name}`).toBeLessThanOrEqual(48);
    }
    expect(token('primary')).toEqual({ h: 6, s: 72, l: 45 });
  });

  it('garde --border-subtle plus clair que --border', () => {
    expect(token('border-subtle').l).toBeGreaterThan(token('border').l);
  });
});
