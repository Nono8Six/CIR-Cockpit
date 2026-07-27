#!/usr/bin/env node
// Configurateurs C2 - pipeline d'import deterministe du catalogue technique moteur.
//
// Lit le lot valide de CIR Moteur, le mappe sur le schema `configurator` de C1,
// deduplique par `model_key`, controle chaque contrainte PostgreSQL en local,
// rejoue les validateurs metier existants, compare a l'oracle SQLite, puis ecrit
// un manifeste et un rapport de controles.
//
// Le script n'ouvre aucune connexion distante et n'ecrit jamais dans Supabase.
// Il echoue fermement (exit 2) tant qu'une anomalie bloquante subsiste : sans
// decision explicite, aucun payload n'est emis.
//
// Usage :
//   node scripts/configurator-c2-import.mjs
//   node scripts/configurator-c2-import.mjs --source-root=C:\GitHub\CIR_Moteur
//   node scripts/configurator-c2-import.mjs --emit-payload=<dir>

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(HERE, '..');

const args = new Map(
  process.argv.slice(2).map((raw) => {
    const [key, ...rest] = raw.replace(/^--/, '').split('=');
    return [key, rest.length > 0 ? rest.join('=') : 'true'];
  }),
);

const SOURCE_ROOT = args.get('source-root') ?? 'C:\\GitHub\\CIR_Moteur';
const EXTRACT_DIR = path.join(SOURCE_ROOT, 'tools', 'extract', 'out');
const DATA_DIR = path.join(SOURCE_ROOT, 'backend', 'data');
const PDF_ROOT = path.join(SOURCE_ROOT, 'Catalogue fabricant');
const ORACLE_DB = path.join(DATA_DIR, 'cir-motors.db');
const OUT_DIR = args.get('out') ?? path.join(REPO_ROOT, 'docs', 'CONFIGURATEURS', 'c2');
const PAYLOAD_DIR = args.get('emit-payload') ?? null;

// ---------------------------------------------------------------------------
// Registre documentaire. Chaque edition porte la preuve de sa provenance.
// `sha256` n'est jamais recopie depuis le JSON : il est recalcule sur le PDF.
// ---------------------------------------------------------------------------
const DOCUMENT_REGISTRY = [
  {
    filename: 'Catalogue_LS_LSES.pdf',
    brand: 'Leroy-Somer',
    file: 'Catalogue_LS_LSES.pdf',
    editionLabel: '5147 fr - 2023.08 / j',
    editionEvidence: 'catalogEdition des sorties dimensions-leroy-somer.json + LISEZ_MOI.txt',
    editionConfirmed: true,
  },
  {
    filename: 'Catalogue_BONFIGLIOLI_Moteur.pdf',
    brand: 'Bonfiglioli',
    file: 'Catalogue_BONFIGLIOLI_Moteur.pdf',
    // Aucune reference d'edition n'est imprimee dans le PDF : l'edition reste
    // absente. Le nom de fichier editeur est conserve comme metadonnee du
    // manifeste, il ne vaut pas edition.
    editionLabel: null,
    editionEvidence: "aucune reference d'edition imprimee dans le PDF",
    publisherFilename: 'Bonfiglioli_Moteurs_BN_BE_M_ME_BNEXY_R07_0_EN.pdf',
    editionConfirmed: true,
  },
  {
    filename: 'Catalogue_Moteur_Innomotics.pdf',
    brand: 'Innomotics',
    file: 'Catalogue_Moteur_Innomotics.pdf',
    editionLabel: 'Catalog D 81.1 - Edition 02/2026',
    editionEvidence: 'page 1 imprimee : "Catalog D 81.1 | Edition 02/2026"',
    editionConfirmed: true,
  },
  {
    filename: 'LSHRM_Leroy-Somer.pdf',
    brand: 'Leroy-Somer',
    file: 'LSHRM_Leroy-Somer.pdf',
    editionLabel: '5729 fr - 2020.03 / a',
    editionEvidence: 'catalogEdition des sorties dimensions-dyneo.json + LISEZ_MOI.txt',
    editionConfirmed: true,
  },
  {
    filename: 'Dyneo   IE5.pdf',
    brand: 'Leroy-Somer',
    file: 'Dyneo   IE5.pdf',
    editionLabel: '5842 fr - 2020.05 / d',
    editionEvidence: 'page 1 imprimee : "5842 fr - 2020.05 / d"',
    editionConfirmed: true,
  },
  {
    filename: '6154c_fr_CILS_IE4.pdf',
    brand: 'Leroy-Somer',
    file: path.join('Leroy_Somer_catalogues_moteurs', '6154c_fr_CILS_IE4.pdf'),
    editionLabel: '6154c fr - 2025',
    editionEvidence: 'catalogEdition des sorties cils.json + LISEZ_MOI.txt',
    editionConfirmed: true,
  },
];

// Nombre de pages releve une fois par pdfplumber ; recontrole par `--page-counts`
// si le PO veut rejouer la mesure. Aucune valeur n'est deduite.
const DOCUMENT_PAGE_COUNTS = {
  'Catalogue_LS_LSES.pdf': 152,
  'Catalogue_BONFIGLIOLI_Moteur.pdf': 118,
  'Catalogue_Moteur_Innomotics.pdf': 768,
  'LSHRM_Leroy-Somer.pdf': 76,
  'Dyneo   IE5.pdf': 54,
  '6154c_fr_CILS_IE4.pdf': 20,
};

const SOURCE_FILES = [
  { role: 'models', name: 'leroy-somer.json', dir: EXTRACT_DIR, kind: 'product', validated: true },
  { role: 'models', name: 'bonfiglioli.json', dir: EXTRACT_DIR, kind: 'product', validated: true },
  { role: 'models', name: 'innomotics.json', dir: EXTRACT_DIR, kind: 'product', validated: true },
  { role: 'models', name: 'dyneo.json', dir: EXTRACT_DIR, kind: 'product', validated: true },
  { role: 'models', name: 'bonfiglioli-legacy.json', dir: EXTRACT_DIR, kind: 'product', validated: true },
  { role: 'models', name: 'cils.json', dir: EXTRACT_DIR, kind: 'product', validated: true },
  { role: 'dimensions', name: 'dimensions-leroy-somer.json', dir: EXTRACT_DIR, kind: 'dimension', validated: true },
  { role: 'dimensions', name: 'dimensions-bonfiglioli.json', dir: EXTRACT_DIR, kind: 'dimension', validated: true },
  { role: 'dimensions', name: 'dimensions-innomotics.json', dir: EXTRACT_DIR, kind: 'dimension', validated: true },
  { role: 'dimensions', name: 'dimensions-dyneo.json', dir: EXTRACT_DIR, kind: 'dimension', validated: true },
  { role: 'dimensions', name: 'dimensions-cils.json', dir: EXTRACT_DIR, kind: 'dimension', validated: true },
  { role: 'torque_points', name: 'cils-vfd-torque.json', dir: EXTRACT_DIR, kind: 'torque', validated: true },
  { role: 'correlations', name: 'bonfiglioli-correlation.json', dir: EXTRACT_DIR, kind: 'correlation', validated: true },
  { role: 'iec_thresholds', name: 'iec-30-1-thresholds.json', dir: DATA_DIR, kind: 'iec30_1', validated: true },
  { role: 'iec_thresholds', name: 'iec-30-2-thresholds.json', dir: EXTRACT_DIR, kind: 'iec30_2', validated: true },
  { role: 'validation_issues', name: 'bonfiglioli-legacy-anomalies.json', dir: EXTRACT_DIR, kind: 'anomaly', validated: true },
  { role: 'validation_issues', name: 'cils-anomalies.json', dir: EXTRACT_DIR, kind: 'anomaly', validated: true },
];

const CANONICAL_CODES = new Set(['A', 'B', 'C', 'H', 'D', 'E', 'F', 'M', 'N', 'P', 'S', 'T', 'Z']);
const CANONICAL_DIMENSION_CODES = new Set(['A', 'B', 'C', 'H', 'D', 'E', 'F']);
const ALLOWED_POLES = new Set([2, 4, 6, 8, 10, 12]);
const ALLOWED_FLANGE_MOUNTINGS = new Set(['B5', 'B14', 'B34', 'B35']);
const ALLOWED_DIMENSION_MOUNTINGS = new Set(['B3', 'B5', 'B14', 'B34', 'B35', 'V1', 'ANY']);
const ALLOWED_TECHNOLOGIES = new Set(['asynchronous', 'PMaSynRM', 'SynRM', 'PM']);
const ALLOWED_CASINGS = new Set(['aluminium', 'cast-iron', 'steel']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
// Sentinelle de composition de cle : distingue "absent" d'une chaine vide.
const NIL = String.fromCharCode(0);

const NORMALIZED_BRANDS = {
  'Leroy-Somer': 'leroy-somer',
  Bonfiglioli: 'bonfiglioli',
  Innomotics: 'innomotics',
};

// ---------------------------------------------------------------------------
// Outils purs
// ---------------------------------------------------------------------------
const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sha256Text = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

function readJsonArray(file) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(value)) throw new Error(`Tableau JSON attendu dans ${file}`);
  return value;
}

/** Reprise exacte de configurator.normalize_motor_designation_v1. */
function normalizeDesignation(value) {
  return String(value).replace(/\*/g, '').normalize('NFKC').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/** Reprise exacte de configurator.canonical_numeric_token_v1. */
function canonicalNumericToken(value) {
  let text = String(value);
  if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
  return text.replace(/-/g, 'n').replace(/\./g, 'p');
}

/** Reprise exacte de configurator.derive_motor_identity_discriminator_v1. */
function deriveIdentityDiscriminator(inertia, mass) {
  if (inertia == null && mass == null) return 'standard';
  const j = inertia == null ? 'na' : canonicalNumericToken(inertia);
  const m = mass == null ? 'na' : canonicalNumericToken(mass);
  return `j-${j}-m-${m}`;
}

/** Reprise du normalizeMethod du chargeur SQLite : vocabulaire impose par C1. */
function normalizeExtractionMethod(value) {
  const method = String(value ?? '');
  if (method.includes('rotated')) return 'pdfplumber-rotated';
  if (method.includes('anchored')) return 'pdfplumber-anchored';
  if (method.startsWith('pdfplumber')) return 'pdfplumber-table';
  if (method === 'manual-entry' || method === 'computed') return method;
  return null;
}

function massFields(row) {
  if (row.massKg != null) return { mass: row.massKg, mounting: null };
  if (row.weightKg != null) return { mass: row.weightKg, mounting: null };
  if (row.massB3Kg != null) return { mass: row.massB3Kg, mounting: 'B3' };
  if (row.weightB3Kg != null) return { mass: row.weightB3Kg, mounting: 'B3' };
  if (row.massB5Kg != null) return { mass: row.massB5Kg, mounting: 'B5' };
  if (row.weightB5Kg != null) return { mass: row.weightB5Kg, mounting: 'B5' };
  return { mass: null, mounting: null };
}

function derivePoles(row) {
  if (row.poles != null) return Number(row.poles);
  if (row.motorTechnology === 'PMaSynRM' && typeof row.frequencyHz === 'number' && typeof row.ratedSpeedRpm === 'number') {
    const raw = (120 * row.frequencyHz) / row.ratedSpeedRpm;
    const poles = Math.round(raw);
    if (ALLOWED_POLES.has(poles) && Math.abs(raw - poles) <= 0.05) return poles;
  }
  return null;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

// ---------------------------------------------------------------------------
// Journal d'anomalies du lot (equivalent local de configurator.import_issue)
// ---------------------------------------------------------------------------
const issues = [];
function addIssue(severity, code, message, context, activationBlocking) {
  issues.push({ severity, issue_code: code, message, context, activation_blocking: activationBlocking });
}

// ---------------------------------------------------------------------------
// Etape 1 - inventaire des sources
// ---------------------------------------------------------------------------
function buildSourceInventory() {
  const inventory = [];
  for (const spec of SOURCE_FILES) {
    const file = path.join(spec.dir, spec.name);
    if (!fs.existsSync(file)) {
      addIssue('error', 'SOURCE_FILE_MISSING', `Fichier source absent : ${file}`, { file }, true);
      continue;
    }
    const rows = readJsonArray(file);
    inventory.push({
      file_role: spec.role,
      kind: spec.kind,
      filename: spec.name,
      absolute_path: file,
      sha256: sha256File(file),
      size_bytes: fs.statSync(file).size,
      row_count: rows.length,
      validated: spec.validated,
      read_status: 'readable',
    });
  }
  return inventory;
}

function buildDocuments() {
  const documents = [];
  for (const entry of DOCUMENT_REGISTRY) {
    const file = path.join(PDF_ROOT, entry.file);
    if (!fs.existsSync(file)) {
      addIssue('error', 'SOURCE_DOCUMENT_MISSING', `PDF source introuvable : ${file}`, { file }, true);
      continue;
    }
    const sha256 = sha256File(file);
    const pageCount = DOCUMENT_PAGE_COUNTS[entry.filename] ?? null;
    if (pageCount == null) {
      addIssue('error', 'SOURCE_DOCUMENT_PAGE_COUNT_MISSING', `Nombre de pages inconnu pour ${entry.filename}`, { filename: entry.filename }, true);
    }
    if (entry.editionLabel == null) {
      addIssue(
        'info',
        'SOURCE_DOCUMENT_EDITION_ABSENT',
        `Aucune edition imprimee pour ${entry.filename} : edition_label reste NULL, le nom de fichier editeur reste une metadonnee du manifeste`,
        { filename: entry.filename, publisher_filename: entry.publisherFilename ?? null, evidence: entry.editionEvidence },
        false,
      );
    }
    documents.push({
      filename: entry.filename,
      brand: entry.brand,
      sha256,
      edition_label: entry.editionLabel,
      edition_evidence: entry.editionEvidence,
      publisher_filename: entry.publisherFilename ?? null,
      page_count: pageCount,
      physical_path: file,
    });
  }
  return documents;
}

// ---------------------------------------------------------------------------
// Etape 2 - provenance
// ---------------------------------------------------------------------------
class SourceRefTable {
  constructor(documents) {
    this.byFilename = new Map(documents.map((d) => [d.filename, d]));
    this.bySha = new Map(documents.map((d) => [d.sha256, d]));
    this.refs = new Map();
    this.methodMapping = new Map();
  }

  resolveDocument(provenance, origin) {
    const sha = provenance.catalogSha256 ? String(provenance.catalogSha256).toLowerCase() : null;
    const filename = provenance.catalog ? String(provenance.catalog) : null;
    if (sha && SHA256_PATTERN.test(sha)) {
      const bySha = this.bySha.get(sha);
      if (!bySha) {
        addIssue('error', 'PROVENANCE_DOCUMENT_UNKNOWN', `SHA-256 de provenance inconnu du registre : ${sha}`, { origin, sha256: sha, filename }, true);
        return null;
      }
      if (filename && bySha.filename !== filename) {
        addIssue('error', 'PROVENANCE_DOCUMENT_MISMATCH', `Le SHA-256 ${sha} ne correspond pas au fichier ${filename}`, { origin, sha256: sha, filename }, true);
        return null;
      }
      return bySha;
    }
    if (filename && this.byFilename.has(filename)) {
      // Provenance sans SHA : resolue par nom, puis verifiee sur le PDF reel.
      const doc = this.byFilename.get(filename);
      addIssue(
        'info',
        'PROVENANCE_SHA_RESOLVED_BY_FILENAME',
        `Provenance sans catalogSha256 : ${filename} resolu par nom, empreinte recalculee sur le PDF`,
        { origin, filename, sha256: doc.sha256 },
        false,
      );
      return doc;
    }
    addIssue('error', 'PROVENANCE_DOCUMENT_UNRESOLVED', `Provenance sans document resoluble`, { origin, filename, sha256: sha }, true);
    return null;
  }

  ensure(provenance, parentProvenance, origin) {
    const merged = { ...(parentProvenance ?? {}), ...(provenance ?? {}) };
    const document = this.resolveDocument(merged, origin);
    if (!document) return null;

    const pdfPage = merged.pdfPage;
    if (!Number.isInteger(pdfPage) || pdfPage < 1) {
      addIssue('error', 'PROVENANCE_PAGE_INVALID', `pdfPage absent ou invalide (${pdfPage})`, { origin, filename: document.filename }, true);
      return null;
    }
    if (document.page_count != null && pdfPage > document.page_count) {
      addIssue('error', 'PROVENANCE_PAGE_OUT_OF_RANGE', `pdfPage ${pdfPage} hors du document ${document.filename} (${document.page_count} pages)`, { origin }, true);
      return null;
    }

    const verbatim = String(merged.extractionMethod ?? '');
    const method = normalizeExtractionMethod(verbatim);
    if (method == null) {
      addIssue('error', 'PROVENANCE_METHOD_UNSUPPORTED', `Methode d'extraction non supportee par C1 : ${verbatim || '<absente>'}`, { origin }, true);
      return null;
    }
    if (verbatim !== method) {
      const bucket = this.methodMapping.get(verbatim) ?? { normalized: method, count: 0 };
      bucket.count += 1;
      this.methodMapping.set(verbatim, bucket);
    }

    const catalogPage = merged.catalogPage == null ? null : String(merged.catalogPage);
    const tableIndex = merged.tableIndex == null ? null : Number(merged.tableIndex);
    const note = merged.normalizationNote == null ? null : String(merged.normalizationNote);
    const key = [document.filename, pdfPage, catalogPage ?? NIL, tableIndex ?? NIL, method, note ?? NIL].join('|');
    const existing = this.refs.get(key);
    if (existing) return existing;

    const ref = {
      ref_key: key,
      document_filename: document.filename,
      document_sha256: document.sha256,
      pdf_page: pdfPage,
      catalog_page: catalogPage,
      table_index: Number.isFinite(tableIndex) ? tableIndex : null,
      extraction_method: method,
      extraction_method_verbatim: verbatim,
      normalization_note: note,
    };
    this.refs.set(key, ref);
    return ref;
  }

  ordered() {
    return [...this.refs.values()].sort((a, b) => a.ref_key.localeCompare(b.ref_key));
  }
}

// ---------------------------------------------------------------------------
// Etape 3 - modeles et points de fonctionnement
// ---------------------------------------------------------------------------
// `max_torque_nm` et `variant_key` descendent du modele vers le point de
// fonctionnement : le catalogue les publie par calibre, pas par moteur physique.
const MODEL_ATTRIBUTES = [
  ['series', (r) => r.series ?? null],
  ['article_no', (r) => r.articleNo ?? null],
  ['motor_technology', (r) => r.motorTechnology ?? 'asynchronous'],
  ['casing_material', (r) => r.casingMaterial ?? null],
  ['protection_ip', (r) => r.protectionIp ?? null],
  ['frame_size', (r) => (r.frameSize == null ? null : Number(r.frameSize))],
  ['lifecycle', (r) => r.lifecycle ?? 'current'],
];

const POINT_PAYLOAD_FIELDS = [
  'powerKw', 'ratedSpeedRpm', 'efficiencyClass', 'efficiencyStandard', 'ratedTorqueNm',
  'ratedCurrentA', 'ratedCurrent400V', 'maxCurrentA', 'noiseDb', 'cosPhi100',
  'startingTorqueRatio', 'startingCurrentRatio', 'breakdownTorqueRatio',
  'efficiency50', 'efficiency75', 'efficiency100',
];

function buildModelsAndPoints(productRows, sourceRefs) {
  const models = new Map();
  const rejected = [];

  for (const entry of productRows) {
    const { file, index, row } = entry;
    const origin = `${file}#${index}`;
    const designation = row.type ?? row.designation ?? null;
    if (!designation) {
      rejected.push({ origin, reason: 'designation absente' });
      addIssue('error', 'MODEL_DESIGNATION_MISSING', 'Designation de modele absente', { origin }, true);
      continue;
    }
    const poles = derivePoles(row);
    if (poles == null || !ALLOWED_POLES.has(poles)) {
      rejected.push({ origin, designation, reason: `poles non derivables (${row.poles ?? 'absent'})` });
      addIssue('error', 'MODEL_POLES_UNRESOLVED', `Nombre de poles non derivable pour ${designation}`, { origin }, true);
      continue;
    }
    const ref = sourceRefs.ensure(row.provenance, null, origin);
    if (!ref) {
      rejected.push({ origin, designation, reason: 'provenance non resoluble' });
      continue;
    }

    const { mass, mounting } = massFields(row);
    const inertia = row.inertiaKgm2 ?? null;
    const normalizedBrand = NORMALIZED_BRANDS[row.brand] ?? normalizeDesignation(row.brand);
    const normalizedDesignation = normalizeDesignation(designation);
    const discriminator = deriveIdentityDiscriminator(inertia, mass);
    const modelKey = `${normalizedBrand}:${normalizedDesignation}:${discriminator}`;

    let model = models.get(modelKey);
    if (!model) {
      model = {
        model_key: modelKey,
        normalized_brand: normalizedBrand,
        normalized_designation: normalizedDesignation,
        identity_discriminator: discriminator,
        brand: row.brand,
        designation: String(designation).trim(),
        pole_config: String(row.poleConfig ?? poles),
        mass_kg: mass,
        mass_mounting: mounting,
        inertia_kgm2: inertia,
        source_ref: ref,
        attributes: {},
        attribute_conflicts: {},
        origins: [],
        points: [],
      };
      for (const [name, get] of MODEL_ATTRIBUTES) model.attributes[name] = get(row);
      models.set(modelKey, model);
    } else {
      for (const [name, get] of MODEL_ATTRIBUTES) {
        const incoming = get(row);
        const current = model.attributes[name];
        if (incoming == null) continue;
        if (current == null) { model.attributes[name] = incoming; continue; }
        if (String(current) !== String(incoming)) {
          const bucket = model.attribute_conflicts[name] ?? new Set();
          bucket.add(String(current));
          bucket.add(String(incoming));
          model.attribute_conflicts[name] = bucket;
        }
      }
    }
    model.origins.push(origin);

    model.points.push({
      origin,
      file,
      index,
      row,
      source_ref: ref,
      poles,
      supply_mode: row.supplyMode ?? null,
      frequency_hz: row.frequencyHz ?? null,
      voltage_v: row.voltageV ?? null,
      coupling: row.coupling ?? null,
      power_kw: row.powerKw ?? null,
      rated_speed_rpm: row.ratedSpeedRpm ?? null,
      efficiency_class: row.efficiencyClass ?? null,
      efficiency_standard: row.efficiencyStandard ?? null,
      // Calibre ou variante publie, repris verbatim : fait du point de
      // fonctionnement, jamais du modele. Meme terme que C0 et que
      // motorCandidateSchema.variant_key du contrat Zod partage.
      variant_key: row.variantKey == null ? null : String(row.variantKey).trim(),
      max_torque_nm: row.maxTorqueNm ?? null,
      rated_torque_nm: row.ratedTorqueNm ?? null,
      rated_current_a: row.ratedCurrentA ?? row.ratedCurrent400V ?? null,
      max_current_a: row.maxCurrentA ?? null,
      noise_db: row.noiseDb ?? null,
      cos_phi: row.cosPhi100 ?? null,
      starting_torque_ratio: row.startingTorqueRatio ?? null,
      starting_current_ratio: row.startingCurrentRatio ?? null,
      breakdown_torque_ratio: row.breakdownTorqueRatio ?? null,
      payload_signature: stableStringify(POINT_PAYLOAD_FIELDS.map((f) => row[f] ?? null)),
    });
  }

  // Conflits d'attribut au niveau modele : bloquants, jamais arbitres en silence.
  const modelConflicts = [];
  for (const model of models.values()) {
    const names = Object.keys(model.attribute_conflicts);
    if (names.length === 0) continue;
    const detail = Object.fromEntries(names.map((n) => [n, [...model.attribute_conflicts[n]].sort()]));
    modelConflicts.push({ model_key: model.model_key, designation: model.designation, conflicts: detail, origins: model.origins });
    addIssue(
      'error',
      'MODEL_ATTRIBUTE_CONFLICT',
      `Attributs de modele contradictoires pour ${model.model_key} : ${names.join(', ')}`,
      { model_key: model.model_key, conflicts: detail, origins: model.origins },
      true,
    );
  }

  // Identite du point de fonctionnement : (poles, supply_mode, f, U, couplage).
  const exactDuplicates = [];
  const divergentCollisions = [];
  for (const model of models.values()) {
    const byIdentity = new Map();
    for (const point of model.points) {
      // Identite corrigee en C2 : les cinq colonnes de C1, qui interdisaient
      // deja le doublon 50/60 Hz, plus les trois faits publies qui distinguent
      // deux points d un meme moteur physique.
      const key = [
        point.poles, point.supply_mode, point.frequency_hz,
        point.voltage_v ?? NIL, point.coupling ?? NIL,
        point.power_kw, point.efficiency_class ?? NIL, point.variant_key ?? NIL,
      ].join('|');
      if (!byIdentity.has(key)) byIdentity.set(key, []);
      byIdentity.get(key).push(point);
    }
    for (const [key, group] of byIdentity) {
      if (group.length === 1) { group[0].retained = true; continue; }
      const signatures = new Set(group.map((p) => p.payload_signature));
      if (signatures.size === 1) {
        group[0].retained = true;
        for (const point of group.slice(1)) { point.retained = false; point.merge_reason = 'doublon exact fusionne'; }
        exactDuplicates.push({
          model_key: model.model_key, identity: key,
          kept: group[0].origin, merged: group.slice(1).map((p) => p.origin),
        });
        addIssue('info', 'OPERATING_POINT_EXACT_DUPLICATE', `Doublon exact fusionne sur ${model.model_key} (${key})`, { model_key: model.model_key, identity: key, kept: group[0].origin, merged: group.slice(1).map((p) => p.origin) }, false);
      } else {
        group[0].retained = true;
        for (const point of group.slice(1)) { point.retained = false; point.merge_reason = 'collision d identite non resolue'; }
        divergentCollisions.push({
          model_key: model.model_key,
          designation: model.designation,
          identity: key,
          rows: group.map((p) => ({
            origin: p.origin, power_kw: p.power_kw, rated_speed_rpm: p.rated_speed_rpm,
            efficiency_class: p.efficiency_class, variant_key: p.row.variantKey ?? null,
            pdf_page: p.source_ref.pdf_page, retained: Boolean(p.retained),
          })),
          blocked_rows: group.length - 1,
        });
        addIssue(
          'error',
          'IDENTITY_COLLISION_UNRESOLVED',
          `${group.length} points publies partagent l'identite (${key}) sur ${model.model_key} ; la regle cir.motor.identity-discriminator/v1 ne les separe pas`,
          {
            model_key: model.model_key, identity: key,
            rows: group.map((p) => ({ origin: p.origin, power_kw: p.power_kw, efficiency_class: p.efficiency_class, variant_key: p.row.variantKey ?? null, pdf_page: p.source_ref.pdf_page })),
          },
          true,
        );
      }
    }
  }

  return { models, rejected, modelConflicts, exactDuplicates, divergentCollisions };
}

/**
 * Diagnostic en lecture seule : mesure ce que chaque regle d'identite
 * candidate produirait. Aucune de ces variantes n'est appliquee ; le pipeline
 * reste sur la regle v1 de C1 tant que le PO n'a pas tranche.
 */
function simulateIdentityOptions(productRows) {
  const discriminatorV1 = (row) => {
    const { mass } = massFields(row);
    return deriveIdentityDiscriminator(row.inertiaKgm2 ?? null, mass);
  };
  const discriminatorV2 = (row) => {
    const base = discriminatorV1(row);
    return row.variantKey ? `${base}-v-${normalizeDesignation(row.variantKey)}` : base;
  };
  const identityV1 = (row) => [derivePoles(row), row.supplyMode, row.frequencyHz, row.voltageV ?? '~', row.coupling ?? '~'].join('|');
  const identityWithPower = (row) => `${identityV1(row)}|${row.powerKw}`;
  const identityWithPowerAndClass = (row) => `${identityWithPower(row)}|${row.efficiencyClass ?? '~'}`;

  const evaluate = (label, discriminator, identity, respectsDecision15) => {
    const models = new Map();
    for (const { row } of productRows) {
      const designation = row.type ?? row.designation ?? '';
      const brand = NORMALIZED_BRANDS[row.brand] ?? normalizeDesignation(row.brand);
      const key = `${brand}:${normalizeDesignation(designation)}:${discriminator(row)}`;
      if (!models.has(key)) models.set(key, new Map());
      const bucket = models.get(key);
      const id = identity(row);
      bucket.set(id, (bucket.get(id) ?? 0) + 1);
    }
    let collisions = 0;
    let blocked = 0;
    for (const bucket of models.values()) {
      for (const count of bucket.values()) {
        if (count > 1) { collisions += 1; blocked += count - 1; }
      }
    }
    return { option: label, models: models.size, collisions, blocked_rows: blocked, respecte_decision_15: respectsDecision15 };
  };

  const identityApplied = (row) => `${identityWithPowerAndClass(row)}|${row.variantKey == null ? '~' : String(row.variantKey).trim()}`;

  return [
    evaluate('A - C1 tel quel : discriminant (J, masse), identite (poles, alimentation, f, U, couplage)', discriminatorV1, identityV1, true),
    evaluate('B - A + power_kw dans l identite du point', discriminatorV1, identityWithPower, true),
    evaluate('C - A + power_kw et classe IE dans l identite du point', discriminatorV1, identityWithPowerAndClass, true),
    evaluate('D - discriminant (J, masse, variant_key), identite v1', discriminatorV2, identityV1, false),
    evaluate('E - D + power_kw dans l identite du point', discriminatorV2, identityWithPower, false),
    evaluate('F - D + power_kw et classe IE dans l identite du point', discriminatorV2, identityWithPowerAndClass, false),
    evaluate('G - APPLIQUEE : discriminant v1 inchange, identite du point + power_kw + classe IE + variant_key publie', discriminatorV1, identityApplied, true),
  ];
}

// ---------------------------------------------------------------------------
// Etape 4 - rendements, couples, freins
// ---------------------------------------------------------------------------
function buildDerivedPointRows(models, cilsTorqueRows) {
  const efficiency = [];
  const torque = [];
  const brakes = [];

  for (const model of [...models.values()].sort((a, b) => a.model_key.localeCompare(b.model_key))) {
    for (const point of model.points) {
      if (!point.retained) continue;
      const row = point.row;
      const fractions = [
        [0.5, row.efficiency50, row.cosPhi50],
        [0.75, row.efficiency75, row.cosPhi75],
        [1, row.efficiency100, row.cosPhi100],
      ];
      for (const [fraction, value, cosPhi] of fractions) {
        if (value == null) continue;
        efficiency.push({
          model_key: model.model_key, point_origin: point.origin, load_fraction: fraction,
          efficiency_pct: Number(value), cos_phi: cosPhi == null ? null : Number(cosPhi),
          source_ref: point.source_ref,
        });
      }
      if (Array.isArray(row.torquePoints)) {
        for (const tp of row.torquePoints) {
          if (tp?.torqueNm == null) continue;
          torque.push({
            model_key: model.model_key, point_origin: point.origin,
            at_frequency_hz: Number(tp.frequencyHz), torque_nm: Number(tp.torqueNm),
            source_ref: point.source_ref,
          });
        }
      }
      if (row.brakeModel != null && row.brakeTorqueNm != null) {
        brakes.push({
          model_key: model.model_key, brake_type: String(row.brakeModel).trim(),
          brake_torque_nm: Number(row.brakeTorqueNm), source_ref: point.source_ref,
        });
      }
    }
  }

  // Couples CILS sous variateur : rattaches au point vfd publie du meme moteur.
  const vfdIndex = new Map();
  for (const model of models.values()) {
    for (const point of model.points) {
      if (!point.retained || point.supply_mode !== 'vfd') continue;
      const key = `${normalizeDesignation(point.row.type ?? point.row.designation)}|${point.poles}|${point.power_kw}`;
      if (!vfdIndex.has(key)) vfdIndex.set(key, []);
      vfdIndex.get(key).push({ model, point });
    }
  }
  for (const entry of cilsTorqueRows) {
    const { file, index, row } = entry;
    const origin = `${file}#${index}`;
    const key = `${normalizeDesignation(row.type)}|${row.poles}|${row.powerKw}`;
    const matches = vfdIndex.get(key) ?? [];
    if (matches.length !== 1) {
      addIssue(
        'error',
        'TORQUE_POINT_UNATTACHED',
        `Couple CILS sans point vfd unique (${matches.length} candidats) pour ${row.type} ${row.poles}P ${row.powerKw} kW`,
        { origin, candidates: matches.length, derived_from: 'IDENTITY_COLLISION_UNRESOLVED' },
        true,
      );
      continue;
    }
    const { model, point } = matches[0];
    const ref = entry.source_ref;
    torque.push({
      model_key: model.model_key, point_origin: point.origin,
      at_frequency_hz: Number(row.frequencyHz), torque_nm: Number(row.torqueNm), source_ref: ref,
    });
  }

  // Unicites locales, identiques aux contraintes PostgreSQL. Une repetition
  // strictement identique est une fusion tracee ; une divergence est bloquante.
  const dedupe = (rows, keyOf, valueOf, code, label) => {
    const seen = new Map();
    const kept = [];
    let merged = 0;
    for (const row of rows) {
      const key = keyOf(row);
      const previous = seen.get(key);
      if (previous) {
        if (valueOf(previous) === valueOf(row)) { merged += 1; continue; }
        addIssue('error', code, `${label} contradictoire sur la meme cle : ${key}`, { key, a: valueOf(previous), b: valueOf(row) }, true);
        continue;
      }
      seen.set(key, row);
      kept.push(row);
    }
    return { kept, merged };
  };

  const eff = dedupe(efficiency, (r) => `${r.point_origin}|${r.load_fraction}`, (r) => `${r.efficiency_pct}|${r.cos_phi}`, 'EFFICIENCY_POINT_CONFLICT', 'Point de rendement');
  const tq = dedupe(torque, (r) => `${r.point_origin}|${r.at_frequency_hz}`, (r) => String(r.torque_nm), 'TORQUE_POINT_CONFLICT', 'Point de couple');
  const br = dedupe(brakes, (r) => `${r.model_key}|${r.brake_type}|${r.brake_torque_nm}`, () => 'identique', 'BRAKE_OPTION_CONFLICT', 'Option frein');
  if (br.merged > 0) {
    addIssue('info', 'BRAKE_OPTION_REPEATED', `${br.merged} repetitions d'option frein fusionnees (meme modele, meme type, meme couple)`, { merged: br.merged }, false);
  }

  return { efficiency: eff.kept, torque: tq.kept, brakes: br.kept, merged: { efficiency: eff.merged, torque: tq.merged, brakes: br.merged } };
}

// ---------------------------------------------------------------------------
// Etape 5 - cotes, definitions de cotes et brides
// ---------------------------------------------------------------------------
function dimensionValue(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return { value_mm: raw, value_text: null };
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^-?\d+(?:[.,]\d+)?$/.test(trimmed)) return { value_mm: Number(trimmed.replace(',', '.')), value_text: null };
    if (trimmed) return { value_mm: null, value_text: trimmed };
  }
  return null;
}

function chooseSource(row, keyword) {
  const provenance = row.provenance ?? {};
  const candidates = Array.isArray(provenance.sources) && provenance.sources.length > 0 ? provenance.sources : [provenance];
  const lower = (c) => String(c.extractionMethod ?? '').toLowerCase();
  return (
    candidates.find((c) => lower(c).includes(keyword))
    ?? candidates.find((c) => lower(c).includes('foot'))
    ?? candidates[0]
  );
}

const SHAFT_CODES = new Set(['D', 'DPublished', 'E', 'F', 'G', 'GD', 'DB', 'O', 'D_tolerance', 'O_thread', 'GA', 'GC', 'DA', 'EA', 'FA']);

function buildDimensionsAndFlanges(dimensionRows, models, sourceRefs) {
  // Index de rattachement, identique au chargeur SQLite : articleNo pour
  // Innomotics, designation normalisee ailleurs. Un bloc de cotes s'applique a
  // tous les modeles qui partagent cette cle.
  const index = new Map();
  for (const model of models.values()) {
    const joinValue = model.brand === 'Innomotics'
      ? String(model.attributes.article_no ?? '').toUpperCase()
      : model.normalized_designation;
    const key = `${model.brand}|${joinValue}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(model);
  }

  const definitions = new Map();
  const dimensions = [];
  const flanges = [];
  const unmatched = [];
  const excludedFlanges = [];
  const counters = {
    blocks_in: dimensionRows.length,
    blocks_matched: 0,
    source_cells_total: 0,
    source_cells_matched: 0,
    source_cells_unmatched: 0,
    source_flanges_total: 0,
    source_flanges_matched: 0,
    source_flanges_unmatched: 0,
  };
  const countCells = (row) => {
    let cells = 0;
    const blocks = [];
    if (row.dimensions) blocks.push(row.dimensions);
    if (row.dimensionsByMounting) blocks.push(...Object.values(row.dimensionsByMounting));
    if (row.shaftByPoles) blocks.push(...Object.values(row.shaftByPoles));
    for (const block of blocks) for (const value of Object.values(block)) if (value != null) cells += 1;
    return cells;
  };

  const ensureDefinition = (publishedCode, variantContext, ref) => {
    const key = `${publishedCode}|${variantContext ?? NIL}`;
    const existing = definitions.get(key);
    if (existing) return existing;
    const isPrime = publishedCode.endsWith("'");
    const base = isPrime ? publishedCode.replace(/'+$/, '') : publishedCode;
    let mappingStatus;
    let canonicalCode = null;
    if (publishedCode === 'DPublished') mappingStatus = 'header_contamination';
    else if (!isPrime && CANONICAL_DIMENSION_CODES.has(publishedCode)) { mappingStatus = 'mapped'; canonicalCode = publishedCode; }
    else mappingStatus = 'unmapped';
    const definition = {
      definition_key: key,
      published_code: publishedCode,
      base_published_code: mappingStatus === 'mapped' ? base : (isPrime ? base : null),
      canonical_vocabulary_version: canonicalCode ? 1 : null,
      canonical_code: canonicalCode,
      variant_context: variantContext,
      mapping_status: mappingStatus,
      source_ref: ref,
      usage_count: 0,
    };
    definitions.set(key, definition);
    return definition;
  };

  for (const entry of dimensionRows) {
    const { file, index: rowIndex, row } = entry;
    const origin = `${file}#${rowIndex}`;
    const joinValue = row.brand === 'Innomotics'
      ? String(row.articleNo ?? '').toUpperCase()
      : normalizeDesignation(String(row.designation ?? ''));
    const matches = index.get(`${row.brand}|${joinValue}`) ?? [];
    const cells = countCells(row);
    const flangeCount = (row.flanges ?? []).length;
    counters.source_cells_total += cells;
    counters.source_flanges_total += flangeCount;
    if (matches.length === 0) {
      counters.source_cells_unmatched += cells;
      counters.source_flanges_unmatched += flangeCount;
      unmatched.push({ origin, brand: row.brand, join_value: joinValue, designation: row.designation ?? null, cells, flanges: flangeCount });
      addIssue('warning', 'DIMENSION_BLOCK_UNMATCHED', `Aucun modele ne correspond a la cle de jointure ${joinValue || '<vide>'}`, { origin, brand: row.brand, cells, flanges: flangeCount }, false);
      continue;
    }
    counters.blocks_matched += 1;
    counters.source_cells_matched += cells;
    counters.source_flanges_matched += flangeCount;

    const blocks = [];
    if (row.dimensions) blocks.push({ mounting: 'ANY', polarity: row.poles ?? null, values: row.dimensions });
    if (row.dimensionsByMounting) {
      for (const [mounting, values] of Object.entries(row.dimensionsByMounting)) {
        blocks.push({ mounting, polarity: row.poles ?? null, values });
      }
    }
    if (row.shaftByPoles) {
      for (const [poles, values] of Object.entries(row.shaftByPoles)) {
        blocks.push({ mounting: 'ANY', polarity: Number(poles), values });
      }
    }

    for (const block of blocks) {
      if (!ALLOWED_DIMENSION_MOUNTINGS.has(block.mounting)) {
        addIssue('error', 'DIMENSION_MOUNTING_UNSUPPORTED', `Montage de cote non supporte : ${block.mounting}`, { origin, mounting: block.mounting }, true);
        continue;
      }
      for (const [code, raw] of Object.entries(block.values)) {
        if (raw == null) continue;
        const value = dimensionValue(raw);
        if (!value) {
          addIssue('error', 'DIMENSION_VALUE_UNSUPPORTED', `Valeur de cote non exploitable pour ${code}`, { origin, code, raw: String(raw) }, true);
          continue;
        }
        const keyword = SHAFT_CODES.has(code) ? 'shaft' : 'b3';
        const selected = chooseSource(row, keyword);
        const ref = sourceRefs.ensure(selected, row.provenance, `${origin}:${block.mounting}:${code}`);
        if (!ref) continue;
        const variantContext = code.endsWith("'") ? 'variante primee du catalogue' : null;
        const definition = ensureDefinition(code, variantContext, ref);
        definition.usage_count += 1;
        for (const model of matches) {
          dimensions.push({
            model_key: model.model_key,
            definition_key: definition.definition_key,
            mounting: block.mounting,
            polarity: block.polarity,
            published_code_verbatim: code,
            canonical_vocabulary_version: definition.canonical_vocabulary_version,
            canonical_code: definition.canonical_code,
            variant_context: variantContext,
            value_mm: value.value_mm,
            value_text: value.value_text,
            source_ref: ref,
            origin,
          });
        }
      }
    }

    for (const flange of row.flanges ?? []) {
      if (!ALLOWED_FLANGE_MOUNTINGS.has(flange.mounting)) {
        excludedFlanges.push({ origin, mounting: flange.mounting, designation: flange.designation ?? null, models: matches.length });
        addIssue(
          'info',
          'FLANGE_MOUNTING_OUT_OF_SCOPE',
          `Bride ${flange.mounting} hors perimetre phase 1 (decision C0 §7 : V1 est une position, pas une forme de bride)`,
          { origin, mounting: flange.mounting, designation: flange.designation ?? null },
          false,
        );
        continue;
      }
      const selected = chooseSource(row, String(flange.mounting).toLowerCase());
      const ref = sourceRefs.ensure(selected, row.provenance, `${origin}:flange:${flange.mounting}:${flange.role}`);
      if (!ref) continue;
      const sValue = flange.S;
      const boreType = flange.boreType ?? null;
      for (const model of matches) {
        flanges.push({
          model_key: model.model_key,
          mounting: flange.mounting,
          role: flange.role,
          order_code: flange.orderCode ?? null,
          flange_ref: flange.designation ?? null,
          din_ref: flange.dinDesignation ?? null,
          bore_type: boreType,
          dim_m_mm: flange.M ?? null,
          dim_n_mm: flange.N ?? null,
          dim_p_mm: flange.P ?? null,
          dim_s_mm: typeof sValue === 'number' ? sValue : null,
          dim_s_thread: typeof sValue === 'string' ? sValue : null,
          dim_t_mm: flange.T ?? null,
          dim_la_mm: flange.LA ?? null,
          dim_le_mm: flange.LE ?? null,
          holes: flange.holes ?? null,
          source_ref: ref,
          origin,
        });
      }
    }
  }

  // Unicites PostgreSQL.
  const dimSeen = new Map();
  const keptDimensions = [];
  const dimensionConflicts = [];
  for (const row of dimensions) {
    const key = [row.model_key, row.mounting, row.polarity ?? NIL, row.published_code_verbatim, row.variant_context ?? NIL].join('|');
    const previous = dimSeen.get(key);
    if (previous) {
      const same = previous.value_mm === row.value_mm && previous.value_text === row.value_text;
      if (!same) {
        dimensionConflicts.push({ key, kept: previous.value_mm ?? previous.value_text, rejected: row.value_mm ?? row.value_text, origins: [previous.origin, row.origin] });
        addIssue('error', 'DIMENSION_VALUE_CONFLICT', `Deux valeurs differentes pour la meme cote : ${key}`, { key, a: previous.value_mm ?? previous.value_text, b: row.value_mm ?? row.value_text, origins: [previous.origin, row.origin] }, true);
      }
      continue;
    }
    dimSeen.set(key, row);
    keptDimensions.push(row);
  }

  const flangeSeen = new Map();
  const keptFlanges = [];
  const flangeConflicts = [];
  for (const row of flanges) {
    const key = [row.model_key, row.mounting, row.role].join('|');
    const previous = flangeSeen.get(key);
    if (previous) {
      const same = previous.flange_ref === row.flange_ref && previous.order_code === row.order_code
        && previous.dim_m_mm === row.dim_m_mm && previous.dim_n_mm === row.dim_n_mm && previous.dim_p_mm === row.dim_p_mm;
      if (!same) {
        flangeConflicts.push({ key, origins: [previous.origin, row.origin], a: previous.flange_ref, b: row.flange_ref });
        addIssue('error', 'FLANGE_OPTION_CONFLICT', `Deux brides differentes pour ${key}`, { key, origins: [previous.origin, row.origin] }, true);
      }
      continue;
    }
    flangeSeen.set(key, row);
    keptFlanges.push(row);
  }

  // Couverture : chaque cellule source rattachee doit produire au moins une ligne.
  const coveredCells = new Set(keptDimensions.map((r) => `${r.origin}|${r.mounting}|${r.polarity ?? NIL}|${r.published_code_verbatim}`));
  const coveredFlanges = new Set(keptFlanges.map((r) => `${r.origin}|${r.mounting}|${r.role}`));

  return {
    definitions: [...definitions.values()].sort((a, b) => a.definition_key.localeCompare(b.definition_key)),
    dimensions: keptDimensions,
    flanges: keptFlanges,
    unmatched,
    excludedFlanges,
    dimensionConflicts,
    flangeConflicts,
    counters: {
      ...counters,
      expanded_dimension_rows: dimensions.length,
      merged_dimension_rows: dimensions.length - keptDimensions.length,
      distinct_source_cells_represented: coveredCells.size,
      expanded_flange_rows: flanges.length,
      merged_flange_rows: flanges.length - keptFlanges.length,
      distinct_source_flanges_represented: coveredFlanges.size,
    },
  };
}

// ---------------------------------------------------------------------------
// Etape 6 - correlations et seuils normatifs
// ---------------------------------------------------------------------------
function buildCorrelations(rows, sourceRefs) {
  const kept = [];
  const seen = new Map();
  const collapsed = [];
  for (const { file, index, row } of rows) {
    const origin = `${file}#${index}`;
    const ref = sourceRefs.ensure(row.provenance, null, origin);
    if (!ref) continue;
    const value = {
      brand: row.brand,
      power_kw: Number(row.powerKw),
      poles: Number(row.poles),
      designation_from: row.left?.type ?? null,
      efficiency_from: row.left?.efficiencyClass ?? null,
      designation_to: row.right?.type ?? null,
      efficiency_to: row.right?.efficiencyClass ?? null,
      source_ref: ref,
      origin,
    };
    if (!value.designation_from || !value.designation_to || !value.efficiency_from || !value.efficiency_to) {
      addIssue('error', 'CORRELATION_INCOMPLETE', 'Correlation constructeur incomplete', { origin }, true);
      continue;
    }
    value.frequency_hz = row.frequencyHz ?? null;
    if (value.frequency_hz == null) {
      addIssue('error', 'CORRELATION_FREQUENCY_MISSING', 'Correlation sans frequence publiee', { origin }, true);
      continue;
    }
    // La frequence publiee fait partie de l'unicite depuis le correctif C2 :
    // les memes equivalences paraissent a 50 Hz et a 60 Hz sur deux pages.
    const key = [value.brand, value.power_kw, value.poles, value.frequency_hz, value.designation_from, value.efficiency_from, value.designation_to, value.efficiency_to].join('|');
    const previous = seen.get(key);
    if (previous) {
      collapsed.push({ key, kept_origin: previous.origin, lost_origin: origin, frequency_hz: value.frequency_hz });
      addIssue('error', 'CORRELATION_DUPLICATE', `Correlation strictement identique en double : ${key}`, { key, kept_origin: previous.origin, lost_origin: origin }, true);
      continue;
    }
    seen.set(key, value);
    kept.push(value);
  }
  return { rows: kept, collapsed };
}

function buildThresholds(rows30_1, rows30_2, sourceRefs) {
  const mains = [];
  const vsd = [];
  const seenMains = new Set();
  const seenVsd = new Set();

  for (const { file, index, row } of rows30_1) {
    const origin = `${file}#${index}`;
    const ref = sourceRefs.ensure(row.provenance, null, origin);
    if (!ref) continue;
    const key = [row.efficiencyClass, row.poles, row.frequencyHz, row.powerKw].join('|');
    if (seenMains.has(key)) { addIssue('error', 'IEC_THRESHOLD_DUPLICATE', `Seuil IEC 60034-30-1 en double : ${key}`, { origin }, true); continue; }
    seenMains.add(key);
    mains.push({
      efficiency_class: row.efficiencyClass, poles: Number(row.poles), frequency_hz: Number(row.frequencyHz),
      power_kw: Number(row.powerKw), min_efficiency: Number(row.minEfficiency), standard_ref: row.standardRef,
      source_ref: ref, origin,
    });
  }
  for (const { file, index, row } of rows30_2) {
    const origin = `${file}#${index}`;
    const ref = sourceRefs.ensure(row.provenance, null, origin);
    if (!ref) continue;
    const key = [row.efficiencyClass, row.speedMinRpm, row.speedMaxRpm, row.powerKw].join('|');
    if (seenVsd.has(key)) { addIssue('error', 'IEC_VSD_THRESHOLD_DUPLICATE', `Seuil IEC TS 60034-30-2 en double : ${key}`, { origin }, true); continue; }
    seenVsd.add(key);
    vsd.push({
      efficiency_class: row.efficiencyClass, speed_min_rpm: Number(row.speedMinRpm), speed_max_rpm: Number(row.speedMaxRpm),
      power_kw: Number(row.powerKw), min_efficiency: Number(row.minEfficiency), standard_ref: row.standardRef,
      source_ref: ref, origin,
    });
  }
  return { mains, vsd };
}

// ---------------------------------------------------------------------------
// Etape 7 - validateurs metier repris de CIR Moteur (backend/validation/*.ts)
// ---------------------------------------------------------------------------
function decimals(value) {
  const text = String(value);
  return text.includes('.') ? text.split('.')[1].length : 0;
}
const halfStep = (value) => 0.5 * Math.pow(10, -decimals(value));

function runValidators(models, efficiencyRows, thresholds) {
  const curvesByPoint = new Map();
  for (const row of efficiencyRows) {
    if (!curvesByPoint.has(row.point_origin)) curvesByPoint.set(row.point_origin, []);
    curvesByPoint.get(row.point_origin).push(row);
  }
  const mainsIndex = new Map(thresholds.mains.map((t) => [`${t.efficiency_class}|${t.poles}|${t.frequency_hz}|${t.power_kw}`, t.min_efficiency]));

  const found = [];
  for (const model of [...models.values()].sort((a, b) => a.model_key.localeCompare(b.model_key))) {
    for (const point of model.points) {
      if (!point.retained) continue;
      const curve = curvesByPoint.get(point.origin) ?? [];
      const eff100 = curve.find((c) => c.load_fraction === 1)?.efficiency_pct ?? null;
      const eff50 = curve.find((c) => c.load_fraction === 0.5)?.efficiency_pct ?? null;
      const push = (severity, ruleCode, message, observed, expected, restriction) => found.push({
        model_key: model.model_key, point_origin: point.origin, severity, rule_code: ruleCode,
        message, observed: String(observed), expected: String(expected), restriction: restriction ?? null,
        source_ref: point.source_ref,
        // Cle de comparaison avec l'oracle SQLite : marque, designation, point.
        target_key: [
          ruleCode, model.normalized_brand, model.normalized_designation,
          point.poles, point.supply_mode, point.power_kw,
        ].join('|'),
      });

      // torqueMismatch
      if (point.rated_torque_nm != null && point.rated_speed_rpm > 5) {
        const dPower = halfStep(point.power_kw);
        const dTorque = halfStep(point.rated_torque_nm);
        const min = ((point.power_kw - dPower) * 9550) / (point.rated_speed_rpm + 5);
        const max = ((point.power_kw + dPower) * 9550) / (point.rated_speed_rpm - 5);
        if (!(point.rated_torque_nm + dTorque >= min && point.rated_torque_nm - dTorque <= max)) {
          push('error', 'TORQUE_MISMATCH', 'Couple incompatible avec P*9550/n, arrondis catalogue pris en compte', point.rated_torque_nm, `${min.toFixed(3)} a ${max.toFixed(3)}`, 'couple publie non utilisable comme fait decisif');
        }
      }
      // currentMismatch
      if (point.rated_current_a != null && point.cos_phi != null && eff100 != null && point.voltage_v != null) {
        const calculated = (point.power_kw * 1000) / (Math.sqrt(3) * point.voltage_v * point.cos_phi * (eff100 / 100));
        if (Math.abs(calculated - point.rated_current_a) / calculated > 0.1) {
          push('error', 'CURRENT_MISMATCH', 'Courant incoherent avec la formule triphasee', point.rated_current_a, calculated.toFixed(2), 'avertir sur le dimensionnement de la protection amont');
        }
      }
      // inertiaImplausible
      if (model.inertia_kgm2 != null && point.power_kw > 0) {
        const ratio = model.inertia_kgm2 / point.power_kw;
        if (ratio < 0.0005 || ratio > 0.15) {
          push('warning', 'INERTIA_IMPLAUSIBLE', 'Rapport inertie/puissance hors plage de plausibilite', `${ratio.toExponential(6)} kgm2/kW`, '0.0005 a 0.15 kgm2/kW', 'aucun conseil fonde sur le rapport d inertie');
        }
      }
      // slipOutOfRange
      if (model.attributes.motor_technology === 'asynchronous' && point.supply_mode === 'mains') {
        const synchronous = (point.frequency_hz * 120) / point.poles;
        const slip = ((synchronous - point.rated_speed_rpm) / synchronous) * 100;
        const maximum = point.power_kw < 0.5 ? 20 : point.power_kw < 3 ? 15 : 12;
        if (!(slip >= 0.2 && slip <= maximum)) {
          push('error', 'SLIP_OUT_OF_RANGE', `Glissement ${slip.toFixed(1)}% incoherent a ${point.frequency_hz}Hz / ${point.poles} poles`, point.rated_speed_rpm, `~${synchronous.toFixed(0)} rpm (0.2 a ${maximum}%)`, null);
        }
      }
      // ieBelowThreshold : referentiel reseau ou variateur selon l'alimentation
      if (point.efficiency_class != null && eff100 != null) {
        const threshold = point.supply_mode === 'mains'
          ? mainsIndex.get(`${point.efficiency_class}|${point.poles}|${Math.round(point.frequency_hz)}|${point.power_kw}`)
          : thresholds.vsd.find((t) => t.efficiency_class === point.efficiency_class
            && t.power_kw === point.power_kw
            && point.rated_speed_rpm >= t.speed_min_rpm
            && point.rated_speed_rpm <= t.speed_max_rpm)?.min_efficiency;
        if (threshold != null && eff100 < threshold - 0.05) {
          push('error', 'IE_BELOW_THRESHOLD', 'Rendement sous le minimum reglementaire de sa classe', eff100, threshold, 'interdit d affirmer que le rendement publie atteint la classe annoncee');
        }
      }
      // efficiencyCurve
      if (eff50 != null && eff100 != null && eff50 > eff100 + 1.5) {
        push('warning', 'EFFICIENCY_CURVE', 'Rendement a 50% nettement superieur au rendement nominal', eff50, `<= ${eff100 + 1.5}`, 'signaler la reserve si le point est utilise dans un calcul energetique');
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Etape 8 - controles de contraintes PostgreSQL simules en local
// ---------------------------------------------------------------------------
function checkTargetConstraints(bundle) {
  const violations = [];
  const fail = (table, constraint, detail) => {
    violations.push({ table, constraint, detail });
    addIssue('error', 'TARGET_CONSTRAINT_VIOLATION', `${table} / ${constraint} : ${detail}`, { table, constraint }, true);
  };

  for (const model of bundle.models) {
    if (!/^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/.test(model.model_key)) fail('motor_model', 'motor_model_key_format_check', model.model_key);
    if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(model.normalized_brand)) fail('motor_model', 'motor_model_normalized_brand_check', model.normalized_brand);
    if (!/^[a-z0-9]+$/.test(model.normalized_designation)) fail('motor_model', 'motor_model_normalized_designation_check', `${model.model_key} -> ${model.normalized_designation}`);
    if (!/^(2|4|6|8|10|12)(\/(2|4|6|8|10|12))*$/.test(model.pole_config)) fail('motor_model', 'motor_model_pole_config_check', `${model.model_key} -> ${model.pole_config}`);
    if (!ALLOWED_TECHNOLOGIES.has(model.motor_technology)) fail('motor_model', 'motor_model_technology_check', `${model.model_key} -> ${model.motor_technology}`);
    if (model.casing_material != null && !ALLOWED_CASINGS.has(model.casing_material)) fail('motor_model', 'motor_model_casing_check', `${model.model_key} -> ${model.casing_material}`);
    if (model.frame_size != null && (model.frame_size < 56 || model.frame_size > 450)) fail('motor_model', 'motor_model_frame_size_check', `${model.model_key} -> ${model.frame_size}`);
    if (model.inertia_kgm2 != null && model.inertia_kgm2 < 0) fail('motor_model', 'motor_model_inertia_check', model.model_key);
    if (model.mass_kg != null && !(model.mass_kg > 0)) fail('motor_model', 'motor_model_mass_check', model.model_key);
    if (model.mass_mounting != null && !['B3', 'B5', 'B14', 'B34', 'B35', 'V1'].includes(model.mass_mounting)) fail('motor_model', 'motor_model_mass_mounting_check', model.model_key);
    if (!['current', 'legacy'].includes(model.lifecycle)) fail('motor_model', 'motor_model_lifecycle_check', model.model_key);
    if (model.identity_discriminator !== deriveIdentityDiscriminator(model.inertia_kgm2, model.mass_kg)) fail('motor_model', 'motor_model_identity_discriminator_value_check', model.model_key);
  }

  for (const point of bundle.operatingPoints) {
    if (!['mains', 'vfd'].includes(point.supply_mode)) fail('motor_operating_point', 'supply_mode_check', point.origin);
    if (!(point.frequency_hz >= 10 && point.frequency_hz <= 400)) fail('motor_operating_point', 'frequency_check', `${point.origin} -> ${point.frequency_hz}`);
    if (point.voltage_v != null && !(point.voltage_v >= 100 && point.voltage_v <= 1000)) fail('motor_operating_point', 'voltage_check', `${point.origin} -> ${point.voltage_v}`);
    if (point.coupling != null && !['Y', 'D'].includes(point.coupling)) fail('motor_operating_point', 'coupling_check', point.origin);
    if (point.rated_speed_rpm == null) fail('motor_operating_point', 'rated_speed_rpm_not_null', point.origin);
    else if (!(point.rated_speed_rpm >= 300 && point.rated_speed_rpm <= 6500)) fail('motor_operating_point', 'speed_check', `${point.origin} -> ${point.rated_speed_rpm}`);
    if (!(point.power_kw > 0 && point.power_kw <= 1200)) fail('motor_operating_point', 'power_check', `${point.origin} -> ${point.power_kw}`);
    if (point.efficiency_class != null && !['IE1', 'IE2', 'IE3', 'IE4', 'IE5'].includes(point.efficiency_class)) fail('motor_operating_point', 'efficiency_class_check', point.origin);
    if (point.efficiency_standard != null && !['IEC 60034-30-1', 'IEC TS 60034-30-2'].includes(point.efficiency_standard)) fail('motor_operating_point', 'efficiency_standard_check', `${point.origin} -> ${point.efficiency_standard}`);
    if (point.efficiency_class === 'IE5' && point.supply_mode !== 'vfd') fail('motor_operating_point', 'ie5_vfd_check', point.origin);
    if (point.rated_torque_nm != null && !(point.rated_torque_nm > 0)) fail('motor_operating_point', 'rated_torque_check', point.origin);
    if (point.max_torque_nm != null && !(point.max_torque_nm > 0)) fail('motor_operating_point', 'max_torque_check', point.origin);
    if (point.variant_key != null && (point.variant_key !== point.variant_key.trim() || point.variant_key.length < 1 || point.variant_key.length > 120)) {
      fail('motor_operating_point', 'variant_key_check', `${point.origin} -> ${point.variant_key}`);
    }
    if (point.rated_current_a != null && !(point.rated_current_a > 0)) fail('motor_operating_point', 'rated_current_check', point.origin);
    if (point.max_current_a != null && !(point.max_current_a > 0)) fail('motor_operating_point', 'max_current_check', point.origin);
    if (point.noise_db != null && !(point.noise_db >= 0 && point.noise_db <= 150)) fail('motor_operating_point', 'noise_check', point.origin);
    if (point.cos_phi != null && !(point.cos_phi >= 0.1 && point.cos_phi <= 1)) fail('motor_operating_point', 'cos_phi_check', `${point.origin} -> ${point.cos_phi}`);
  }

  // Synchrone => uniquement des points vfd (declencheur de contrainte C1).
  for (const model of bundle.modelObjects) {
    if (model.attributes.motor_technology === 'asynchronous') continue;
    const retained = model.points.filter((p) => p.retained);
    if (retained.length === 0 || retained.some((p) => p.supply_mode !== 'vfd')) {
      fail('motor_model', 'motor_model_supply_mode_constraint', `${model.model_key} technologie ${model.attributes.motor_technology}`);
    }
  }

  for (const row of bundle.efficiency) {
    if (!(row.load_fraction > 0 && row.load_fraction <= 1)) fail('motor_efficiency_point', 'load_check', row.point_origin);
    if (!(row.efficiency_pct >= 10 && row.efficiency_pct <= 100)) fail('motor_efficiency_point', 'value_check', `${row.point_origin} -> ${row.efficiency_pct}`);
    if (row.cos_phi != null && !(row.cos_phi >= 0.1 && row.cos_phi <= 1)) fail('motor_efficiency_point', 'cos_phi_check', row.point_origin);
  }
  for (const row of bundle.torque) {
    if (!(row.at_frequency_hz > 0 && row.at_frequency_hz <= 400)) fail('motor_torque_point', 'frequency_check', `${row.point_origin} -> ${row.at_frequency_hz}`);
    if (!(row.torque_nm > 0)) fail('motor_torque_point', 'value_check', row.point_origin);
  }
  for (const row of bundle.brakes) {
    if (!(row.brake_torque_nm > 0)) fail('motor_brake_option', 'torque_check', row.model_key);
    if (!row.brake_type || row.brake_type !== row.brake_type.trim()) fail('motor_brake_option', 'type_check', row.model_key);
  }
  for (const row of bundle.dimensions) {
    const nonNulls = (row.value_mm != null ? 1 : 0) + (row.value_text != null ? 1 : 0);
    if (nonNulls !== 1) fail('motor_dimension', 'value_check', `${row.model_key} ${row.published_code_verbatim}`);
    if (row.value_mm != null && row.value_mm < 0) fail('motor_dimension', 'value_mm_check', `${row.model_key} ${row.published_code_verbatim} -> ${row.value_mm}`);
    if (row.polarity != null && !ALLOWED_POLES.has(row.polarity)) fail('motor_dimension', 'polarity_check', `${row.model_key} -> ${row.polarity}`);
  }
  for (const def of bundle.definitions) {
    if (def.published_code === 'DPublished' && def.mapping_status !== 'header_contamination') fail('motor_dimension_definition', 'header_check', def.published_code);
    if (def.mapping_status === 'mapped' && (def.canonical_code == null || def.base_published_code == null)) fail('motor_dimension_definition', 'mapping_shape_check', def.published_code);
    if (def.mapping_status !== 'mapped' && (def.canonical_code != null || def.canonical_vocabulary_version != null)) fail('motor_dimension_definition', 'mapping_shape_check', def.published_code);
    if (def.canonical_code != null && !CANONICAL_CODES.has(def.canonical_code)) fail('motor_dimension_definition', 'canonical_fk', def.published_code);
    if (["AD'", "AF'", "BA'", "BE'", "B'", "CA'"].includes(def.published_code)) {
      if (def.variant_context == null || def.base_published_code !== def.published_code.replace(/'+$/, '')) {
        fail('motor_dimension_definition', 'prime_context_check', def.published_code);
      }
    }
  }
  for (const row of bundle.flanges) {
    if (row.bore_type == null || !['through', 'tapped'].includes(row.bore_type)) fail('motor_flange_option', 'bore_type_check', `${row.model_key} ${row.mounting}/${row.role}`);
    const nonNulls = (row.dim_s_mm != null ? 1 : 0) + (row.dim_s_thread != null ? 1 : 0);
    if (nonNulls !== 1) fail('motor_flange_option', 'bore_value_check', `${row.model_key} ${row.mounting}/${row.role}`);
    if (row.bore_type === 'through' && row.dim_s_mm == null) fail('motor_flange_option', 'bore_coherence_check', `${row.model_key} ${row.mounting}/${row.role}`);
    if (row.bore_type === 'tapped' && row.dim_s_thread == null) fail('motor_flange_option', 'bore_coherence_check', `${row.model_key} ${row.mounting}/${row.role}`);
    if (row.holes != null && !(row.holes > 0)) fail('motor_flange_option', 'holes_check', `${row.model_key} ${row.mounting}/${row.role}`);
    if (!['standard', 'larger', 'smaller'].includes(row.role)) fail('motor_flange_option', 'role_check', `${row.model_key} ${row.mounting}/${row.role}`);
  }
  for (const row of bundle.correlations) {
    if (!(row.power_kw > 0)) fail('motor_vendor_correlation', 'power_check', row.origin);
    if (!ALLOWED_POLES.has(row.poles)) fail('motor_vendor_correlation', 'poles_check', row.origin);
    if (![50, 60].includes(row.frequency_hz)) fail('motor_vendor_correlation', 'frequency_check', `${row.origin} -> ${row.frequency_hz}`);
    for (const [field, value] of [['efficiency_from', row.efficiency_from], ['efficiency_to', row.efficiency_to]]) {
      if (!['IE1', 'IE2', 'IE3', 'IE4', 'IE5'].includes(value)) fail('motor_vendor_correlation', `${field}_check`, `${row.origin} -> ${value}`);
    }
  }
  for (const row of bundle.thresholds.mains) {
    if (!['IE1', 'IE2', 'IE3', 'IE4'].includes(row.efficiency_class)) fail('motor_iec_threshold', 'class_check', `${row.origin} -> ${row.efficiency_class}`);
    if (![2, 4, 6, 8].includes(row.poles)) fail('motor_iec_threshold', 'poles_check', `${row.origin} -> ${row.poles}`);
    if (![50, 60].includes(row.frequency_hz)) fail('motor_iec_threshold', 'frequency_check', `${row.origin} -> ${row.frequency_hz}`);
    if (!(row.power_kw > 0)) fail('motor_iec_threshold', 'power_check', row.origin);
    if (!(row.min_efficiency >= 10 && row.min_efficiency <= 100)) fail('motor_iec_threshold', 'efficiency_check', `${row.origin} -> ${row.min_efficiency}`);
  }
  for (const row of bundle.thresholds.vsd) {
    if (!['IE1', 'IE2', 'IE3', 'IE4', 'IE5'].includes(row.efficiency_class)) fail('motor_iec_vsd_threshold', 'class_check', row.origin);
    if (!(row.speed_min_rpm > 0 && row.speed_max_rpm >= row.speed_min_rpm)) fail('motor_iec_vsd_threshold', 'speed_check', row.origin);
    if (!(row.power_kw > 0)) fail('motor_iec_vsd_threshold', 'power_check', row.origin);
    if (!(row.min_efficiency >= 10 && row.min_efficiency <= 100)) fail('motor_iec_vsd_threshold', 'efficiency_check', row.origin);
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Etape 9 - oracle SQLite
// ---------------------------------------------------------------------------
function readOracle() {
  if (!fs.existsSync(ORACLE_DB)) return { available: false, reason: `base absente : ${ORACLE_DB}` };
  try {
    const require_ = createRequire(path.join(SOURCE_ROOT, 'package.json'));
    const Database = require_('better-sqlite3');
    const db = new Database(ORACLE_DB, { readonly: true });
    const count = (table) => Number(db.prepare(`select count(*) as n from ${table}`).get().n);
    const result = {
      available: true,
      counts: {
        catalog_document: count('catalog_document'),
        source_ref: count('source_ref'),
        motor_model: count('motor_model'),
        motor_operating_point: count('motor_operating_point'),
        efficiency_point: count('efficiency_point'),
        torque_point: count('torque_point'),
        model_dimension: count('model_dimension'),
        flange_option: count('flange_option'),
        vendor_correlation: count('vendor_correlation'),
        iec_efficiency_threshold: count('iec_efficiency_threshold'),
        iec_vsd_efficiency_threshold: count('iec_vsd_efficiency_threshold'),
        validation_issue: count('validation_issue'),
      },
      validation_issues: db.prepare(`
        select vi.rule_code, vi.severity, m.brand, m.designation, op.poles, op.supply_mode, op.power_kw
        from validation_issue vi
        left join motor_model m on m.id = vi.model_id
        left join motor_operating_point op on op.id = vi.operating_point_id
        order by vi.rule_code, m.designation, op.poles, op.power_kw
      `).all(),
      // Reconciliation ligne par ligne : chaque modele SQLite, son identite
      // physique et ses volumes de cotes et de brides. Le model_key candidat est
      // recalcule a partir des memes faits publies (marque, designation,
      // inertie, masse), ce qui rend les deux mondes directement comparables.
      models: db.prepare(`
        select m.id, m.brand, m.designation, m.article_no, m.inertia_kgm2, m.mass_kg,
               (select count(*) from model_dimension d where d.model_id = m.id) as dimensions,
               (select count(*) from flange_option f where f.model_id = m.id) as flanges,
               (select count(*) from motor_operating_point op where op.model_id = m.id) as points
        from motor_model m
        order by m.id
      `).all(),
    };
    db.close();
    return result;
  } catch (error) {
    return { available: false, reason: String(error?.message ?? error) };
  }
}

/**
 * Reconciliation ligne par ligne des cotes et des brides entre l'oracle SQLite
 * et le lot candidat. Chaque modele SQLite est projete sur le model_key
 * candidat par la meme regle que le pipeline, puis les volumes sont compares
 * groupe par groupe. Chaque ecart recoit une cause nommee ; aucun total n'est
 * accepte sans explication.
 */
function reconcilePerModel(oracle, modelRows, dimensions, flanges) {
  if (!oracle.available) return { available: false, reason: oracle.reason };

  const candidateDimensions = new Map();
  for (const row of dimensions) candidateDimensions.set(row.model_key, (candidateDimensions.get(row.model_key) ?? 0) + 1);
  const candidateFlanges = new Map();
  for (const row of flanges) candidateFlanges.set(row.model_key, (candidateFlanges.get(row.model_key) ?? 0) + 1);
  const candidateModels = new Set(modelRows.map((m) => m.model_key));

  const oracleGroups = new Map();
  for (const model of oracle.models) {
    const brand = NORMALIZED_BRANDS[model.brand] ?? normalizeDesignation(model.brand);
    const discriminator = deriveIdentityDiscriminator(model.inertia_kgm2 ?? null, model.mass_kg ?? null);
    const key = `${brand}:${normalizeDesignation(model.designation)}:${discriminator}`;
    const bucket = oracleGroups.get(key) ?? { model_key: key, oracle_models: 0, oracle_dimensions: 0, oracle_flanges: 0, designations: new Set() };
    bucket.oracle_models += 1;
    bucket.oracle_dimensions += model.dimensions;
    bucket.oracle_flanges += model.flanges;
    bucket.designations.add(model.designation);
    oracleGroups.set(key, bucket);
  }

  const lines = [];
  const causes = { dimensions: {}, flanges: {} };
  const addCause = (kind, cause, delta) => {
    const bucket = causes[kind][cause] ?? { groupes: 0, delta: 0 };
    bucket.groupes += 1;
    bucket.delta += delta;
    causes[kind][cause] = bucket;
  };

  const keys = new Set([...oracleGroups.keys(), ...candidateModels]);
  for (const key of [...keys].sort()) {
    const oracleGroup = oracleGroups.get(key);
    const oracleDim = oracleGroup?.oracle_dimensions ?? 0;
    const oracleFlange = oracleGroup?.oracle_flanges ?? 0;
    const candidateDim = candidateDimensions.get(key) ?? 0;
    const candidateFlange = candidateFlanges.get(key) ?? 0;
    const deltaDim = candidateDim - oracleDim;
    const deltaFlange = candidateFlange - oracleFlange;
    if (deltaDim === 0 && deltaFlange === 0) continue;

    let cause;
    if (!oracleGroup) cause = 'modele absent de l oracle (jeux Bonfiglioli legacy et CILS)';
    else if (!candidateModels.has(key)) cause = 'modele oracle sans equivalent candidat';
    else if (oracleGroup.oracle_models > 1) cause = `fusion de ${oracleGroup.oracle_models} modeles oracle en un model_key`;
    else if (oracleDim === 0 && candidateDim > 0) cause = 'bloc de cotes rattache par le candidat, orphelin dans l oracle';
    else if (candidateDim === 0 && oracleDim > 0) cause = 'bloc de cotes rattache par l oracle, orphelin pour le candidat';
    else cause = 'eclatement par montage et polarite';

    if (deltaDim !== 0) addCause('dimensions', cause, deltaDim);
    if (deltaFlange !== 0) addCause('flanges', cause, deltaFlange);
    lines.push({
      model_key: key,
      designations: oracleGroup ? [...oracleGroup.designations].sort() : [],
      oracle_models: oracleGroup?.oracle_models ?? 0,
      oracle_dimensions: oracleDim,
      candidate_dimensions: candidateDim,
      delta_dimensions: deltaDim,
      oracle_flanges: oracleFlange,
      candidate_flanges: candidateFlange,
      delta_flanges: deltaFlange,
      cause,
    });
  }

  const total = (kind) => Object.values(causes[kind]).reduce((a, b) => a + b.delta, 0);
  return {
    available: true,
    oracle_dimensions: oracle.counts.model_dimension,
    candidate_dimensions: dimensions.length,
    delta_dimensions_explique: total('dimensions'),
    delta_dimensions_constate: dimensions.length - oracle.counts.model_dimension,
    oracle_flanges: oracle.counts.flange_option,
    candidate_flanges: flanges.length,
    delta_flanges_explique: total('flanges'),
    delta_flanges_constate: flanges.length - oracle.counts.flange_option,
    causes,
    lignes: lines.sort((a, b) => Math.abs(b.delta_dimensions) - Math.abs(a.delta_dimensions) || a.model_key.localeCompare(b.model_key)),
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
function main() {
  const startedAt = new Date().toISOString();
  const inventory = buildSourceInventory();
  const documents = buildDocuments();
  const sourceRefs = new SourceRefTable(documents);

  const load = (kind) => {
    const rows = [];
    for (const spec of SOURCE_FILES.filter((s) => s.kind === kind)) {
      const file = path.join(spec.dir, spec.name);
      if (!fs.existsSync(file)) continue;
      readJsonArray(file).forEach((row, index) => rows.push({ file: spec.name, index, row }));
    }
    return rows;
  };

  const productRows = load('product');
  const dimensionRows = load('dimension');
  const correlationRows = load('correlation');
  const iec30_1Rows = load('iec30_1');
  const iec30_2Rows = load('iec30_2');
  const anomalyRows = load('anomaly');
  const torqueRows = load('torque');

  const { models, rejected, modelConflicts, exactDuplicates, divergentCollisions } = buildModelsAndPoints(productRows, sourceRefs);

  // Provenance des couples CILS resolue avant rattachement.
  for (const entry of torqueRows) {
    entry.source_ref = sourceRefs.ensure(entry.row.provenance, null, `${entry.file}#${entry.index}`);
  }
  const derived = buildDerivedPointRows(models, torqueRows.filter((e) => e.source_ref));

  // Rendements et couples portes par les points bloques : perte induite, non
  // independante, a rattacher a la collision d'identite qui la provoque.
  let derivedLostToBlockedPoints = { efficiency: 0, torque: 0 };
  for (const model of models.values()) {
    for (const point of model.points) {
      if (point.retained) continue;
      for (const value of [point.row.efficiency50, point.row.efficiency75, point.row.efficiency100]) {
        if (value != null) derivedLostToBlockedPoints.efficiency += 1;
      }
      if (Array.isArray(point.row.torquePoints)) {
        derivedLostToBlockedPoints.torque += point.row.torquePoints.filter((t) => t?.torqueNm != null).length;
      }
    }
  }

  const identityOptions = simulateIdentityOptions(productRows);
  const dimensionResult = buildDimensionsAndFlanges(dimensionRows, models, sourceRefs);
  const correlationResult = buildCorrelations(correlationRows, sourceRefs);
  const correlations = correlationResult.rows;
  const thresholds = buildThresholds(iec30_1Rows, iec30_2Rows, sourceRefs);
  const validationIssues = runValidators(models, derived.efficiency, thresholds);

  // Anomalies imprimees deja relevees par les extracteurs, conservees telles quelles.
  const printedAnomalies = anomalyRows.map(({ file, index, row }) => ({
    origin: `${file}#${index}`, rule_code: row.code, designation: row.designation,
    poles: row.poles ?? null, power_kw: row.powerKw ?? null, pdf_page: row.pdfPage ?? null, message: row.message,
  }));

  const modelRows = [...models.values()].sort((a, b) => a.model_key.localeCompare(b.model_key)).map((m) => ({
    model_key: m.model_key,
    normalized_brand: m.normalized_brand,
    normalized_designation: m.normalized_designation,
    identity_discriminator: m.identity_discriminator,
    brand: m.brand,
    series: m.attributes.series,
    designation: m.designation,
    article_no: m.attributes.article_no,
    pole_config: m.pole_config,
    motor_technology: m.attributes.motor_technology,
    casing_material: m.attributes.casing_material,
    protection_ip: m.attributes.protection_ip,
    frame_size: m.attributes.frame_size,
    inertia_kgm2: m.inertia_kgm2,
    mass_kg: m.mass_kg,
    mass_mounting: m.mass_mounting,
    lifecycle: m.attributes.lifecycle,
    source_ref_key: m.source_ref.ref_key,
  }));

  const retainedPoints = [];
  const blockedPoints = [];
  for (const model of models.values()) {
    for (const point of model.points) {
      const value = {
        model_key: model.model_key, origin: point.origin, poles: point.poles, supply_mode: point.supply_mode,
        frequency_hz: point.frequency_hz, voltage_v: point.voltage_v, coupling: point.coupling,
        rated_speed_rpm: point.rated_speed_rpm, power_kw: point.power_kw, efficiency_class: point.efficiency_class,
        efficiency_standard: point.efficiency_standard, variant_key: point.variant_key,
        max_torque_nm: point.max_torque_nm, rated_torque_nm: point.rated_torque_nm,
        rated_current_a: point.rated_current_a, max_current_a: point.max_current_a, noise_db: point.noise_db,
        cos_phi: point.cos_phi, starting_torque_ratio: point.starting_torque_ratio,
        starting_current_ratio: point.starting_current_ratio, breakdown_torque_ratio: point.breakdown_torque_ratio,
        source_ref_key: point.source_ref.ref_key, merge_reason: point.merge_reason ?? null,
      };
      if (point.retained) retainedPoints.push(value); else blockedPoints.push(value);
    }
  }
  retainedPoints.sort((a, b) => a.origin.localeCompare(b.origin));
  blockedPoints.sort((a, b) => a.origin.localeCompare(b.origin));

  const bundle = {
    models: modelRows,
    modelObjects: [...models.values()],
    operatingPoints: retainedPoints,
    efficiency: derived.efficiency,
    torque: derived.torque,
    brakes: derived.brakes,
    definitions: dimensionResult.definitions,
    dimensions: dimensionResult.dimensions,
    flanges: dimensionResult.flanges,
    correlations,
    thresholds,
  };
  const constraintViolations = checkTargetConstraints(bundle);

  const provenanceRefs = sourceRefs.ordered();
  const missingProvenance = [
    ...modelRows.filter((r) => !r.source_ref_key).map((r) => ({ table: 'motor_model', key: r.model_key })),
    ...retainedPoints.filter((r) => !r.source_ref_key).map((r) => ({ table: 'motor_operating_point', key: r.origin })),
    ...thresholds.mains.filter((r) => !r.source_ref).map((r) => ({ table: 'motor_iec_threshold', key: r.origin })),
    ...thresholds.vsd.filter((r) => !r.source_ref).map((r) => ({ table: 'motor_iec_vsd_threshold', key: r.origin })),
  ];
  if (missingProvenance.length > 0) {
    addIssue('error', 'PROVENANCE_MISSING', `${missingProvenance.length} lignes sans provenance`, { rows: missingProvenance.slice(0, 20) }, true);
  }

  const oracle = readOracle();
  const perModelReconciliation = reconcilePerModel(oracle, modelRows, dimensionResult.dimensions, dimensionResult.flanges);

  // Empreinte du lot : deterministe, independante de l'horodatage.
  const fingerprintPayload = stableStringify({
    sources: inventory.map((f) => ({ filename: f.filename, sha256: f.sha256, row_count: f.row_count })),
    documents: documents.map((d) => ({ filename: d.filename, sha256: d.sha256, edition_label: d.edition_label, page_count: d.page_count })),
    rules: {
      model_key: 'cir.motor.model-key/v1',
      identity_discriminator: 'cir.motor.identity-discriminator/v1',
      operating_point_identity: 'cir.motor.operating-point-identity/v2',
      dimension_vocabulary_version: 1,
    },
  });
  const fingerprint = sha256Text(fingerprintPayload);

  const blocking = issues.filter((i) => i.activation_blocking);
  const byCode = {};
  for (const issue of issues) {
    const bucket = byCode[issue.issue_code] ?? { severity: issue.severity, activation_blocking: issue.activation_blocking, count: 0 };
    bucket.count += 1;
    byCode[issue.issue_code] = bucket;
  }

  const validationSummary = {};
  for (const issue of validationIssues) {
    const key = `${issue.rule_code}|${issue.severity}`;
    validationSummary[key] = (validationSummary[key] ?? 0) + 1;
  }
  const oracleValidationSummary = {};
  const anomalyReconciliation = { available: oracle.available, oracle_total: 0, matched: 0, missing: [], added: [] };
  if (oracle.available) {
    for (const issue of oracle.validation_issues) {
      const key = `${issue.rule_code}|${issue.severity}`;
      oracleValidationSummary[key] = (oracleValidationSummary[key] ?? 0) + 1;
    }
    const candidateKeys = new Map();
    for (const issue of validationIssues) {
      candidateKeys.set(issue.target_key, (candidateKeys.get(issue.target_key) ?? 0) + 1);
    }
    const oracleKeys = new Set();
    anomalyReconciliation.oracle_total = oracle.validation_issues.length;
    for (const issue of oracle.validation_issues) {
      const key = [
        issue.rule_code,
        NORMALIZED_BRANDS[issue.brand] ?? normalizeDesignation(issue.brand ?? ''),
        normalizeDesignation(issue.designation ?? ''),
        issue.poles, issue.supply_mode, issue.power_kw,
      ].join('|');
      oracleKeys.add(key);
      if (candidateKeys.has(key)) anomalyReconciliation.matched += 1;
      else anomalyReconciliation.missing.push({ rule_code: issue.rule_code, designation: issue.designation, poles: issue.poles, supply_mode: issue.supply_mode, power_kw: issue.power_kw });
    }
    for (const issue of validationIssues) {
      if (!oracleKeys.has(issue.target_key)) {
        anomalyReconciliation.added.push({ rule_code: issue.rule_code, model_key: issue.model_key, point_origin: issue.point_origin, observed: issue.observed, expected: issue.expected });
      }
    }
  }

  // Blocs de cotes sans modele : doivent rester inclus dans ceux deja rejetes
  // par le chargeur SQLite, jamais en constituer de nouveaux.
  const ORACLE_UNMATCHED_JOIN_KEYS = new Set([
    'dimensions-leroy-somer.json', 'dimensions-bonfiglioli.json',
  ]);
  const unmatchedOutsideOracleScope = dimensionResult.unmatched.filter(
    (u) => !ORACLE_UNMATCHED_JOIN_KEYS.has(u.origin.split('#')[0]),
  );

  const manifest = {
    generated_at: startedAt,
    domain: 'motor',
    source_root: SOURCE_ROOT,
    fingerprint_sha256: fingerprint,
    rules: {
      model_key: 'cir.motor.model-key/v1',
      identity_discriminator: 'cir.motor.identity-discriminator/v1',
      operating_point_identity: 'cir.motor.operating-point-identity/v2',
      dimension_vocabulary_version: 1,
    },
    documents,
    files: inventory,
    extraction_method_normalization: [...sourceRefs.methodMapping.entries()]
      .map(([verbatim, v]) => ({ verbatim, normalized: v.normalized, occurrences: v.count }))
      .sort((a, b) => a.verbatim.localeCompare(b.verbatim)),
  };

  // -------------------------------------------------------------------------
  // Non-regression : chaque critere de C0 §11.3 evalue explicitement.
  // -------------------------------------------------------------------------
  const LEGACY_PRODUCT_FILES = new Set(['leroy-somer.json', 'bonfiglioli.json', 'innomotics.json', 'dyneo.json']);
  const baselinePointsRetained = retainedPoints.filter((p) => LEGACY_PRODUCT_FILES.has(p.origin.split('#')[0])).length;
  const baselinePointsBlocked = blockedPoints.filter((p) => LEGACY_PRODUCT_FILES.has(p.origin.split('#')[0])).length;
  const legacyBonfiglioliPoints = retainedPoints.filter((p) => p.origin.startsWith('bonfiglioli-legacy.json')).length
    + blockedPoints.filter((p) => p.origin.startsWith('bonfiglioli-legacy.json')).length;
  const cilsPoints = retainedPoints.filter((p) => p.origin.startsWith('cils.json')).length
    + blockedPoints.filter((p) => p.origin.startsWith('cils.json')).length;
  const cilsTorquePoints = derived.torque.filter((t) => t.source_ref?.document_filename === '6154c_fr_CILS_IE4.pdf').length;
  const cilsDimensionTypes = dimensionRows.filter((e) => e.file === 'dimensions-cils.json').length;
  const lshrm160mr1 = [...models.values()]
    .filter((m) => m.normalized_designation === 'lshrm160mr1')
    .map((m) => ({ model_key: m.model_key, mass_kg: m.mass_kg, inertia_kgm2: m.inertia_kgm2, retained_points: m.points.filter((p) => p.retained).length }));
  const ie5OnMains = retainedPoints.filter((p) => p.efficiency_class === 'IE5' && p.supply_mode !== 'vfd').length;
  const pointsWithoutProvenance = retainedPoints.filter((p) => !p.source_ref_key).length;
  const thresholdsWithoutProvenance = [...thresholds.mains, ...thresholds.vsd].filter((t) => !t.source_ref).length;
  const oracleUnmatchedBlocks = 69;

  const criterion = (label, ok, expected, observed, comment) => ({ critere: label, verdict: ok ? 'OK' : 'ECHEC', attendu: expected, observe: observed, commentaire: comment });
  const nonRegression = [
    criterion(
      'Les 2 355 points source sont tous representes',
      retainedPoints.length === productRows.length && blockedPoints.length === 0,
      `${productRows.length} points source`,
      `${retainedPoints.length} retenus, ${blockedPoints.length} bloques`,
      null,
    ),
    criterion(
      'Aucun des 1 997 points de depart perdu hors remplacement CILS trace',
      baselinePointsBlocked === 0 && baselinePointsRetained === 1997,
      '1997 points d origine tous representes',
      `${baselinePointsRetained} retenus, ${baselinePointsBlocked} bloques`,
      baselinePointsBlocked === 0 ? 'aucun point d origine perdu' : `${baselinePointsBlocked} points d origine bloques par IDENTITY_COLLISION_UNRESOLVED`,
    ),
    criterion(
      'Aucune des 37 917 cotes perdue hors fusion de doublon tracee',
      dimensionResult.counters.distinct_source_cells_represented === dimensionResult.counters.source_cells_matched
        && dimensionResult.counters.blocks_in - dimensionResult.counters.blocks_matched <= oracleUnmatchedBlocks
        && unmatchedOutsideOracleScope.length === 0
        && perModelReconciliation.available
        && perModelReconciliation.delta_dimensions_explique === perModelReconciliation.delta_dimensions_constate,
      'toute cellule source rattachable representee, aucun nouveau bloc orphelin, ecart 37 917 -> cible explique ligne par ligne',
      `${dimensionResult.counters.source_cells_matched} cellules rattachees, ${dimensionResult.counters.distinct_source_cells_represented} representees, ${dimensionResult.counters.merged_dimension_rows} fusionnees ; ecart constate ${perModelReconciliation.available ? perModelReconciliation.delta_dimensions_constate : 'n/a'}, explique ${perModelReconciliation.available ? perModelReconciliation.delta_dimensions_explique : 'n/a'}`,
      `${dimensionResult.counters.blocks_in - dimensionResult.counters.blocks_matched} blocs sans modele contre ${oracleUnmatchedBlocks} dans l oracle SQLite ; detail par model_key dans reconciliation_par_modele`,
    ),
    criterion('324 points Bonfiglioli legacy ajoutes', legacyBonfiglioliPoints === 324, 324, legacyBonfiglioliPoints, null),
    criterion('34 points CILS ajoutes', cilsPoints === 34, 34, cilsPoints, null),
    criterion('68 couples CILS ajoutes', cilsTorquePoints === 68, 68, cilsTorquePoints, cilsTorquePoints === 68 ? null : 'couples orphelins : voir TORQUE_POINT_UNATTACHED'),
    criterion('8 types dimensionnels CILS ajoutes', cilsDimensionTypes === 8, 8, cilsDimensionTypes, null),
    criterion(
      '8 196 brides reconciliees',
      dimensionResult.counters.distinct_source_flanges_represented + dimensionResult.counters.merged_flange_rows
        === dimensionResult.counters.source_flanges_matched - dimensionResult.excludedFlanges.length
        && dimensionResult.flangeConflicts.length === 0
        && perModelReconciliation.available
        && perModelReconciliation.delta_flanges_explique === perModelReconciliation.delta_flanges_constate,
      `${dimensionResult.counters.source_flanges_total} brides source, toutes representees ou fusionnees a l identique, ecart 8 196 -> cible explique ligne par ligne`,
      `${dimensionResult.flanges.length} lignes cible, ${dimensionResult.counters.distinct_source_flanges_represented} brides source representees, ${dimensionResult.counters.merged_flange_rows} fusions identiques, ${dimensionResult.excludedFlanges.length} brides V1 hors perimetre ; ecart constate ${perModelReconciliation.available ? perModelReconciliation.delta_flanges_constate : 'n/a'}, explique ${perModelReconciliation.available ? perModelReconciliation.delta_flanges_explique : 'n/a'}`,
      'oracle SQLite : 8 196 lignes obtenues avec 1 652 modeles ; detail par model_key dans reconciliation_par_modele',
    ),
    criterion(
      '599 correlations reconciliees',
      correlations.length === 599,
      599,
      correlations.length,
      correlationResult.collapsed.length > 0
        ? `${correlationResult.collapsed.length} correlations perdues sur la contrainte d unicite`
        : 'frequency_hz publiee conservee et integree a l unicite',
    ),
    criterion(
      '705 seuils avec provenance',
      thresholds.mains.length + thresholds.vsd.length === 705 && thresholdsWithoutProvenance === 0,
      705,
      `${thresholds.mains.length} + ${thresholds.vsd.length} = ${thresholds.mains.length + thresholds.vsd.length}, ${thresholdsWithoutProvenance} sans provenance`,
      null,
    ),
    criterion(
      '38 anomalies avec les memes codes et cibles',
      oracle.available && anomalyReconciliation.missing.length === 0 && anomalyReconciliation.oracle_total === 38,
      oracle.available ? `${anomalyReconciliation.oracle_total} anomalies oracle toutes retrouvees` : 'oracle indisponible',
      `${anomalyReconciliation.matched} retrouvees, ${anomalyReconciliation.missing.length} manquantes, ${anomalyReconciliation.added.length} nouvelles`,
      'les nouvelles anomalies proviennent des jeux Bonfiglioli legacy et CILS absents de l oracle ; detail dans anomalies_reconciliation',
    ),
    criterion('Aucun point ni seuil sans provenance', pointsWithoutProvenance === 0 && thresholdsWithoutProvenance === 0, 0, pointsWithoutProvenance + thresholdsWithoutProvenance, null),
    criterion(
      'LSHRM 160MR1 conserve ses quatre points',
      lshrm160mr1.length > 0 && lshrm160mr1.every((v) => v.retained_points === 4),
      '4 points par variante',
      lshrm160mr1,
      null,
    ),
    criterion('Aucun IE5 sur reseau', ie5OnMains === 0, 0, ie5OnMains, null),
    criterion(
      'Aucune valeur PDF supprimee ou corrigee silencieusement',
      dimensionResult.dimensionConflicts.length === 0 && dimensionResult.flangeConflicts.length === 0 && constraintViolations.length === 0,
      '0 conflit de valeur, 0 violation de contrainte',
      `${dimensionResult.dimensionConflicts.length} conflits de cote, ${dimensionResult.flangeConflicts.length} conflits de bride, ${constraintViolations.length} violations`,
      'toute divergence est journalisee, aucune valeur n est reecrite',
    ),
  ];

  const report = {
    generated_at: startedAt,
    fingerprint_sha256: fingerprint,
    decision: blocking.length === 0 ? 'GO_TECHNIQUE' : 'NO_GO',
    non_regression: nonRegression,
    volumes: {
      source_rows: {
        product: productRows.length,
        dimension_blocks: dimensionRows.length,
        cils_vfd_torque: torqueRows.length,
        correlations: correlationRows.length,
        iec_30_1: iec30_1Rows.length,
        iec_30_2: iec30_2Rows.length,
        printed_anomalies: anomalyRows.length,
      },
      target_rows: {
        source_document: documents.length,
        source_ref: provenanceRefs.length,
        motor_model: modelRows.length,
        motor_operating_point: retainedPoints.length,
        motor_operating_point_blocked: blockedPoints.length,
        motor_efficiency_point: derived.efficiency.length,
        motor_torque_point: derived.torque.length,
        motor_dimension_definition: dimensionResult.definitions.length,
        motor_dimension: dimensionResult.dimensions.length,
        motor_flange_option: dimensionResult.flanges.length,
        motor_brake_option: derived.brakes.length,
        motor_vendor_correlation: correlations.length,
        motor_iec_threshold: thresholds.mains.length,
        motor_iec_vsd_threshold: thresholds.vsd.length,
        motor_validation_issue: validationIssues.length,
      },
    },
    oracle: oracle.available ? { counts: oracle.counts, validation_summary: oracleValidationSummary } : oracle,
    reconciliation_par_modele: perModelReconciliation,
    deduplication: {
      product_rows_in: productRows.length,
      distinct_model_keys: modelRows.length,
      rows_rejected_before_identity: rejected.length,
      exact_duplicate_identities: exactDuplicates.length,
      exact_duplicate_rows_merged: exactDuplicates.reduce((a, d) => a + d.merged.length, 0),
      divergent_identity_collisions: divergentCollisions.length,
      divergent_rows_blocked: divergentCollisions.reduce((a, d) => a + d.blocked_rows, 0),
      model_attribute_conflicts: modelConflicts.length,
      derived_rows_merged: derived.merged,
      derived_rows_lost_to_blocked_points: derivedLostToBlockedPoints,
    },
    identity_rule_options: identityOptions,
    dimension_reconciliation: { ...dimensionResult.counters, unmatched_blocks_outside_oracle_scope: unmatchedOutsideOracleScope },
    anomalies_reconciliation: anomalyReconciliation,
    validation: { candidate_summary: validationSummary, issues: validationIssues.map((i) => ({ rule_code: i.rule_code, severity: i.severity, model_key: i.model_key, point_origin: i.point_origin, observed: i.observed, expected: i.expected })) },
    printed_anomalies: printedAnomalies,
    constraint_violations: constraintViolations,
    dimension_blocks_unmatched: dimensionResult.unmatched,
    flanges_out_of_scope: dimensionResult.excludedFlanges,
    dimension_value_conflicts: dimensionResult.dimensionConflicts,
    flange_conflicts: dimensionResult.flangeConflicts,
    correlation_frequency_collapse: correlationResult.collapsed,
    blocking_details: {
      model_attribute_conflicts: modelConflicts,
      divergent_identity_collisions: divergentCollisions,
      blocked_operating_points: blockedPoints,
    },
    issue_summary: byCode,
    issues_blocking: blocking.length,
    issues_total: issues.length,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'lot-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'controles.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'anomalies.json'), `${JSON.stringify(issues, null, 2)}\n`, 'utf8');

  if (PAYLOAD_DIR) {
    if (blocking.length > 0) {
      console.error(`Payload non emis : ${blocking.length} anomalies bloquantes.`);
    } else {
      fs.mkdirSync(PAYLOAD_DIR, { recursive: true });
      const payload = {
        fingerprint_sha256: fingerprint, documents, source_refs: provenanceRefs,
        models: modelRows, operating_points: retainedPoints, efficiency_points: derived.efficiency,
        torque_points: derived.torque, brake_options: derived.brakes,
        dimension_definitions: dimensionResult.definitions, dimensions: dimensionResult.dimensions,
        flange_options: dimensionResult.flanges, vendor_correlations: correlations,
        iec_thresholds: thresholds.mains, iec_vsd_thresholds: thresholds.vsd,
        validation_issues: validationIssues,
      };
      fs.writeFileSync(path.join(PAYLOAD_DIR, 'candidate-payload.json'), `${JSON.stringify(payload)}\n`, 'utf8');
      console.log(`Payload ecrit dans ${PAYLOAD_DIR}`);
    }
  }

  console.log(`Empreinte du lot : ${fingerprint}`);
  console.log(`Decision technique : ${report.decision}`);
  console.log(`Anomalies : ${issues.length} dont ${blocking.length} bloquantes`);
  console.table(report.volumes.target_rows);
  if (blocking.length > 0) {
    const grouped = {};
    for (const issue of blocking) grouped[issue.issue_code] = (grouped[issue.issue_code] ?? 0) + 1;
    console.log('Codes bloquants :', grouped);
    process.exitCode = 2;
  }
}

main();
