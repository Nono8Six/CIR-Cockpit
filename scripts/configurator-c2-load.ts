#!/usr/bin/env -S deno run --allow-env --allow-read --allow-net --allow-write
// Configurateurs C2 - chargement du lot valide dans un snapshot candidat.
//
// Deux modes, jamais enchaines automatiquement :
//   --mode=load      cree le snapshot candidat et charge le lot, sans activer
//   --mode=activate  active un snapshot deja pret, via configurator.activate_snapshot
//
// Garanties :
//   - une seule transaction par mode ; toute erreur annule l'integralite
//     du chargement, `sql.begin` de postgres.js emettant ROLLBACK sur exception ;
//   - idempotence par l'empreinte du lot : un lot deja charge est reconnu et
//     refuse sans ecriture ni doublon ;
//   - aucun secret journalise : la chaine de connexion n'est jamais affichee et
//     le mot de passe est masque dans les messages d'erreur.
//
// Le chargeur ne calcule aucune donnee metier : il consomme le payload produit
// par `scripts/configurator-c2-import.mjs --emit-payload`.
//
// Usage :
//   deno run --allow-env --allow-read --allow-net --allow-write --env-file=backend/.env \
//     scripts/configurator-c2-load.ts --mode=load --payload=<dir>/candidate-payload.json
//   deno run ... --mode=activate --snapshot=<uuid> --note="..."

import postgres from 'postgres';

type Row = Record<string, unknown>;

const args = new Map(
  Deno.args.map((raw) => {
    const [key, ...rest] = raw.replace(/^--/, '').split('=');
    return [key, rest.length > 0 ? rest.join('=') : 'true'];
  }),
);

const MODE = args.get('mode') ?? 'load';
const PAYLOAD_PATH = args.get('payload') ?? '';
const MANIFEST_PATH = args.get('manifest') ?? 'docs/CONFIGURATEURS/c2/lot-manifest.json';
const ANOMALIES_PATH = args.get('anomalies') ?? 'docs/CONFIGURATEURS/c2/anomalies.json';
const DIFF_PATH = args.get('diff-out') ?? 'docs/CONFIGURATEURS/c2/diff-activation.json';
const SNAPSHOT_ARG = args.get('snapshot') ?? '';
const ACTOR_ID = args.get('actor') ?? '';
const LABEL = args.get('label') ?? 'Catalogue technique moteur - lot C2';
const NOTE = args.get('note') ?? '';

const DATABASE_URL = Deno.env.get('DATABASE_URL') ?? '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL absent de l environnement.');
  Deno.exit(1);
}
if (!ACTOR_ID) {
  console.error('--actor=<uuid du profil super_admin> requis.');
  Deno.exit(1);
}

// Masquage du secret dans toute sortie, y compris les erreurs du pilote.
const SECRET = (() => {
  try {
    return decodeURIComponent(new URL(DATABASE_URL).password);
  } catch {
    return '';
  }
})();
const redact = (value: unknown): string => {
  const text = value instanceof Error ? `${value.message}` : String(value);
  return SECRET ? text.split(SECRET).join('***') : text;
};

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** Serialisation stable : l'empreinte ne depend pas de l'ordre des cles. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Row;
  return `{${Object.keys(record).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',')}}`;
}

const readJson = (path: string): unknown => JSON.parse(Deno.readTextFileSync(path));

// Le pooler Supavisor est en mode transaction : les instructions preparees
// cote serveur y sont proscrites.
const sql = postgres(DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 30,
  idle_timeout: 20,
  onnotice: () => {},
});

/**
 * Les types npm de postgres.js ne decrivent ni l'assistant de valeurs
 * `sql(rows, ...colonnes)` ni l'equivalence entre TransactionSql et Sql. Cet
 * adaptateur exprime le contrat runtime reellement offert par la bibliotheque,
 * sans rien changer a son comportement.
 */
type Tx = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]>;
  (rows: Row[], ...columns: string[]): unknown;
  json(value: unknown): unknown;
};

const begin = <T>(handler: (tx: Tx) => Promise<T>): Promise<T> =>
  (sql.begin as unknown as (fn: (tx: Tx) => Promise<T>) => Promise<T>)(handler);

/**
 * Insertion par lots. PostgreSQL plafonne a 65535 parametres par instruction ;
 * la taille de lot est deduite du nombre de colonnes.
 */
async function insertChunks<T extends Row>(
  rows: T[],
  columns: string[],
  run: (chunk: T[]) => Promise<Row[]>,
): Promise<Row[]> {
  const size = Math.max(1, Math.floor(55000 / Math.max(1, columns.length)));
  const out: Row[] = [];
  for (let index = 0; index < rows.length; index += size) {
    out.push(...await run(rows.slice(index, index + size)));
  }
  return out;
}

const sourceRefKeyOf = (row: Row): string =>
  (row.source_ref_key as string | undefined)
  ?? ((row.source_ref as Row | undefined)?.ref_key as string);

// ---------------------------------------------------------------------------
// Mode load
// ---------------------------------------------------------------------------
async function load(): Promise<void> {
  const payload = readJson(PAYLOAD_PATH) as Record<string, Row[] | string>;
  const manifest = readJson(MANIFEST_PATH) as Row;
  const anomalies = readJson(ANOMALIES_PATH) as Row[];
  const fingerprint = payload.fingerprint_sha256 as string;

  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Empreinte de lot invalide.');
  if (fingerprint !== manifest.fingerprint_sha256) {
    throw new Error('Le payload et le manifeste ne portent pas la meme empreinte.');
  }

  const list = (key: string): Row[] => payload[key] as Row[];
  const counters = {
    source_document: list('documents').length,
    source_ref: list('source_refs').length,
    motor_model: list('models').length,
    motor_operating_point: list('operating_points').length,
    motor_efficiency_point: list('efficiency_points').length,
    motor_torque_point: list('torque_points').length,
    motor_dimension_definition: list('dimension_definitions').length,
    motor_dimension: list('dimensions').length,
    motor_flange_option: list('flange_options').length,
    motor_brake_option: list('brake_options').length,
    motor_vendor_correlation: list('vendor_correlations').length,
    motor_iec_threshold: list('iec_thresholds').length,
    motor_iec_vsd_threshold: list('iec_vsd_thresholds').length,
    motor_validation_issue: list('validation_issues').length,
  };

  const result = await begin(async (tx) => {
    await tx`set local statement_timeout = '900s'`;

    // Idempotence : l'empreinte du lot est unique par domaine.
    const existing = await tx`
      select b.id, b.status, b.candidate_snapshot_id, s.status as snapshot_status, s.is_active
      from configurator.import_batch b
      join configurator.catalog_snapshot s on s.id = b.candidate_snapshot_id
      where b.domain = 'motor' and b.fingerprint_sha256 = ${fingerprint}
    `;
    if (existing.length > 0) {
      return { idempotent: true, existing: existing[0] as Row };
    }

    const [snapshot] = await tx`
      insert into configurator.catalog_snapshot (domain, label, status, created_by)
      values ('motor', ${LABEL}, 'candidate', ${ACTOR_ID})
      returning id
    `;
    const snapshotId = snapshot.id as string;

    const [batch] = await tx`
      insert into configurator.import_batch
        (domain, candidate_snapshot_id, fingerprint_sha256, status, created_by, analysis_started_at)
      values ('motor', ${snapshotId}, ${fingerprint}, 'loading', ${ACTOR_ID}, now())
      returning id
    `;
    const batchId = batch.id as string;

    // Fichiers du lot : chacun garde son empreinte et son role.
    const manifestBytes = Deno.statSync(MANIFEST_PATH).size;
    const manifestSha = await sha256Hex(Deno.readTextFileSync(MANIFEST_PATH));
    const files = (manifest.files as Row[]).map((file) => ({
      batch_id: batchId,
      file_role: file.file_role,
      filename: file.filename,
      sha256: file.sha256,
      size_bytes: file.size_bytes,
      row_count: file.row_count,
      read_status: 'readable',
    }));
    files.push({
      batch_id: batchId,
      file_role: 'manifest',
      filename: 'lot-manifest.json',
      sha256: manifestSha,
      size_bytes: manifestBytes,
      row_count: (manifest.files as Row[]).length,
      read_status: 'readable',
    });
    await tx`insert into configurator.import_file ${tx(files, 'batch_id', 'file_role', 'filename', 'sha256', 'size_bytes', 'row_count', 'read_status')}`;

    // Documents source. `source_document` n'a pas de `snapshot_id` : la table est
    // partagee et dedupliquee par `sha256`, l'identite d'un document etant son
    // contenu. Un conflit signifie donc que le PDF est deja enregistre, pas qu'il
    // faut le reecrire : la ligne existante est reutilisee telle quelle. Ecraser
    // ses metadonnees modifierait la provenance citee par le snapshot actif.
    const documentIds = new Map<string, string>();
    for (const document of list('documents')) {
      const sha = document.sha256 as string;
      const [inserted] = await tx`
        insert into configurator.source_document (brand, filename, sha256, edition_label, page_count)
        values (${document.brand as string}, ${document.filename as string}, ${sha},
                ${document.edition_label as string | null}, ${document.page_count as number})
        on conflict (sha256) do nothing
        returning id
      `;
      if (inserted) {
        documentIds.set(document.filename as string, inserted.id as string);
        continue;
      }
      const [existing] = await tx`
        select id, brand, filename, edition_label, page_count
        from configurator.source_document
        where sha256 = ${sha}
      `;
      if (!existing) throw new Error(`Document source introuvable apres conflit : ${sha}`);
      // Meme empreinte donc memes octets : toute divergence de libelle est une
      // contradiction du lot, remontee et jamais absorbee silencieusement.
      const divergences = (['brand', 'filename', 'edition_label', 'page_count'] as const)
        .filter((field) => existing[field] !== document[field])
        .map((field) => `${field}: enregistre=${existing[field]}, lot=${document[field]}`);
      if (divergences.length > 0) {
        throw new Error(
          `Document deja enregistre sous une autre identite (${sha}) : ${divergences.join(' ; ')}`,
        );
      }
      documentIds.set(document.filename as string, existing.id as string);
    }

    // Provenance. Meme regle que les documents : le sextuplet unique EST le fait
    // de provenance. Si la page a deja ete extraite par la meme methode, la ligne
    // existante est reutilisee sans etre touchee. `extracted_at` conserve la date
    // de la premiere extraction : la reecrire ferait mentir la provenance des
    // snapshots deja charges, dont l'actif.
    const refIds = new Map<string, number>();
    for (const ref of list('source_refs')) {
      const documentId = documentIds.get(ref.document_filename as string)!;
      const pdfPage = ref.pdf_page as number;
      const catalogPage = ref.catalog_page as string | null;
      const tableIndex = ref.table_index as number | null;
      const method = ref.extraction_method as string;
      const note = ref.normalization_note as string | null;
      const [inserted] = await tx`
        insert into configurator.source_ref
          (document_id, pdf_page, catalog_page, table_index, extraction_method, normalization_note, extracted_at)
        values (${documentId}, ${pdfPage}, ${catalogPage}, ${tableIndex}, ${method}, ${note}, now())
        on conflict on constraint "source_ref_page_method_unique" do nothing
        returning id
      `;
      if (inserted) {
        refIds.set(ref.ref_key as string, Number(inserted.id));
        continue;
      }
      const [existing] = await tx`
        select id from configurator.source_ref
        where document_id = ${documentId}
          and pdf_page = ${pdfPage}
          and catalog_page is not distinct from ${catalogPage}
          and table_index is not distinct from ${tableIndex}
          and extraction_method = ${method}
          and normalization_note is not distinct from ${note}
      `;
      if (!existing) {
        throw new Error(`Provenance introuvable apres conflit : ${ref.ref_key as string}`);
      }
      refIds.set(ref.ref_key as string, Number(existing.id));
    }
    const refId = (row: Row): number => {
      const id = refIds.get(sourceRefKeyOf(row));
      if (id === undefined) throw new Error(`Provenance introuvable : ${sourceRefKeyOf(row)}`);
      return id;
    };

    // Modeles.
    const MODEL_COLUMNS = [
      'snapshot_id', 'model_key', 'normalized_brand', 'normalized_designation', 'identity_discriminator',
      'brand', 'series', 'designation', 'article_no', 'pole_config', 'motor_technology',
      'casing_material', 'protection_ip', 'frame_size', 'inertia_kgm2', 'mass_kg', 'mass_mounting',
      'lifecycle', 'source_ref_id',
    ];
    const modelRows = list('models').map((model) => ({
      snapshot_id: snapshotId,
      model_key: model.model_key,
      normalized_brand: model.normalized_brand,
      normalized_designation: model.normalized_designation,
      identity_discriminator: model.identity_discriminator,
      brand: model.brand,
      series: model.series,
      designation: model.designation,
      article_no: model.article_no,
      pole_config: model.pole_config,
      motor_technology: model.motor_technology,
      casing_material: model.casing_material,
      protection_ip: model.protection_ip,
      frame_size: model.frame_size,
      inertia_kgm2: model.inertia_kgm2,
      mass_kg: model.mass_kg,
      mass_mounting: model.mass_mounting,
      lifecycle: model.lifecycle,
      source_ref_id: refId(model),
    }));
    const modelIds = new Map<string, number>();
    const insertedModels = await insertChunks(modelRows, MODEL_COLUMNS, (chunk) =>
      tx`insert into configurator.motor_model ${tx(chunk, ...MODEL_COLUMNS)} returning id, model_key`);
    for (const row of insertedModels) modelIds.set(row.model_key as string, Number(row.id));
    if (modelIds.size !== modelRows.length) throw new Error('Correspondance des modeles incomplete.');
    const modelId = (key: string): number => {
      const id = modelIds.get(key);
      if (id === undefined) throw new Error(`Modele introuvable : ${key}`);
      return id;
    };

    // Points de fonctionnement. La correspondance repose sur l'ordre de
    // RETURNING, verifie ligne a ligne sur trois faits publies.
    const POINT_COLUMNS = [
      'snapshot_id', 'model_id', 'poles', 'supply_mode', 'frequency_hz', 'voltage_v', 'coupling',
      'rated_speed_rpm', 'power_kw', 'efficiency_class', 'efficiency_standard', 'variant_key',
      'max_torque_nm', 'rated_torque_nm', 'rated_current_a', 'max_current_a', 'noise_db', 'cos_phi',
      'starting_torque_ratio', 'starting_current_ratio', 'breakdown_torque_ratio', 'source_ref_id',
    ];
    const pointSource = list('operating_points');
    const pointRows = pointSource.map((point) => ({
      snapshot_id: snapshotId,
      model_id: modelId(point.model_key as string),
      poles: point.poles,
      supply_mode: point.supply_mode,
      frequency_hz: point.frequency_hz,
      voltage_v: point.voltage_v,
      coupling: point.coupling,
      rated_speed_rpm: point.rated_speed_rpm,
      power_kw: point.power_kw,
      efficiency_class: point.efficiency_class,
      efficiency_standard: point.efficiency_standard,
      variant_key: point.variant_key,
      max_torque_nm: point.max_torque_nm,
      rated_torque_nm: point.rated_torque_nm,
      rated_current_a: point.rated_current_a,
      max_current_a: point.max_current_a,
      noise_db: point.noise_db,
      cos_phi: point.cos_phi,
      starting_torque_ratio: point.starting_torque_ratio,
      starting_current_ratio: point.starting_current_ratio,
      breakdown_torque_ratio: point.breakdown_torque_ratio,
      source_ref_id: refId(point),
    }));
    const pointIds = new Map<string, number>();
    let cursor = 0;
    await insertChunks(pointRows, POINT_COLUMNS, async (chunk) => {
      const inserted = await tx`
        insert into configurator.motor_operating_point ${tx(chunk, ...POINT_COLUMNS)}
        returning id, model_id, poles, power_kw
      `;
      if (inserted.length !== chunk.length) throw new Error('Retour d insertion incomplet sur les points.');
      for (let index = 0; index < inserted.length; index += 1) {
        const expected = chunk[index];
        const actual = inserted[index];
        if (
          Number(actual.model_id) !== Number(expected.model_id)
          || Number(actual.poles) !== Number(expected.poles)
          || Number(actual.power_kw) !== Number(expected.power_kw)
        ) {
          throw new Error('Ordre de RETURNING non fiable sur les points de fonctionnement.');
        }
        pointIds.set(pointSource[cursor + index].origin as string, Number(actual.id));
      }
      cursor += chunk.length;
      return [];
    });
    const pointId = (origin: string): number => {
      const id = pointIds.get(origin);
      if (id === undefined) throw new Error(`Point de fonctionnement introuvable : ${origin}`);
      return id;
    };

    // Rendements et couples.
    const EFFICIENCY_COLUMNS = ['snapshot_id', 'operating_point_id', 'load_fraction', 'efficiency_pct', 'cos_phi', 'source_ref_id'];
    const efficiencyRows = list('efficiency_points').map((row) => ({
      snapshot_id: snapshotId,
      operating_point_id: pointId(row.point_origin as string),
      load_fraction: row.load_fraction,
      efficiency_pct: row.efficiency_pct,
      cos_phi: row.cos_phi,
      source_ref_id: refId(row),
    }));
    await insertChunks(efficiencyRows, EFFICIENCY_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_efficiency_point ${tx(chunk, ...EFFICIENCY_COLUMNS)}`;
      return [];
    });

    const TORQUE_COLUMNS = ['snapshot_id', 'operating_point_id', 'at_frequency_hz', 'torque_nm', 'source_ref_id'];
    const torqueRows = list('torque_points').map((row) => ({
      snapshot_id: snapshotId,
      operating_point_id: pointId(row.point_origin as string),
      at_frequency_hz: row.at_frequency_hz,
      torque_nm: row.torque_nm,
      source_ref_id: refId(row),
    }));
    await insertChunks(torqueRows, TORQUE_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_torque_point ${tx(chunk, ...TORQUE_COLUMNS)}`;
      return [];
    });

    // Vocabulaire de cotes du snapshot.
    const definitionIds = new Map<string, number>();
    for (const definition of list('dimension_definitions')) {
      const [inserted] = await tx`
        insert into configurator.motor_dimension_definition
          (snapshot_id, published_code, base_published_code, canonical_vocabulary_version,
           canonical_code, variant_context, mapping_status, source_ref_id)
        values (${snapshotId}, ${definition.published_code as string},
                ${definition.base_published_code as string | null},
                ${definition.canonical_vocabulary_version as number | null},
                ${definition.canonical_code as string | null},
                ${definition.variant_context as string | null},
                ${definition.mapping_status as string}, ${refId(definition)})
        returning id
      `;
      definitionIds.set(definition.definition_key as string, Number(inserted.id));
    }

    const DIMENSION_COLUMNS = [
      'snapshot_id', 'model_id', 'definition_id', 'mounting', 'polarity', 'published_code_verbatim',
      'canonical_vocabulary_version', 'canonical_code', 'variant_context', 'value_mm', 'value_text', 'source_ref_id',
    ];
    const dimensionRows = list('dimensions').map((row) => ({
      snapshot_id: snapshotId,
      model_id: modelId(row.model_key as string),
      definition_id: definitionIds.get(row.definition_key as string)!,
      mounting: row.mounting,
      polarity: row.polarity,
      published_code_verbatim: row.published_code_verbatim,
      canonical_vocabulary_version: row.canonical_vocabulary_version,
      canonical_code: row.canonical_code,
      variant_context: row.variant_context,
      value_mm: row.value_mm,
      value_text: row.value_text,
      source_ref_id: refId(row),
    }));
    await insertChunks(dimensionRows, DIMENSION_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_dimension ${tx(chunk, ...DIMENSION_COLUMNS)}`;
      return [];
    });

    const FLANGE_COLUMNS = [
      'snapshot_id', 'model_id', 'mounting', 'role', 'order_code', 'flange_ref', 'din_ref', 'bore_type',
      'dim_m_mm', 'dim_n_mm', 'dim_p_mm', 'dim_s_mm', 'dim_s_thread', 'dim_t_mm', 'dim_la_mm', 'dim_le_mm',
      'holes', 'source_ref_id',
    ];
    const flangeRows = list('flange_options').map((row) => ({
      snapshot_id: snapshotId,
      model_id: modelId(row.model_key as string),
      mounting: row.mounting,
      role: row.role,
      order_code: row.order_code,
      flange_ref: row.flange_ref,
      din_ref: row.din_ref,
      bore_type: row.bore_type,
      dim_m_mm: row.dim_m_mm,
      dim_n_mm: row.dim_n_mm,
      dim_p_mm: row.dim_p_mm,
      dim_s_mm: row.dim_s_mm,
      dim_s_thread: row.dim_s_thread,
      dim_t_mm: row.dim_t_mm,
      dim_la_mm: row.dim_la_mm,
      dim_le_mm: row.dim_le_mm,
      holes: row.holes,
      source_ref_id: refId(row),
    }));
    await insertChunks(flangeRows, FLANGE_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_flange_option ${tx(chunk, ...FLANGE_COLUMNS)}`;
      return [];
    });

    const BRAKE_COLUMNS = ['snapshot_id', 'model_id', 'brake_type', 'brake_torque_nm', 'source_ref_id'];
    const brakeRows = list('brake_options').map((row) => ({
      snapshot_id: snapshotId,
      model_id: modelId(row.model_key as string),
      brake_type: row.brake_type,
      brake_torque_nm: row.brake_torque_nm,
      source_ref_id: refId(row),
    }));
    await insertChunks(brakeRows, BRAKE_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_brake_option ${tx(chunk, ...BRAKE_COLUMNS)}`;
      return [];
    });

    const CORRELATION_COLUMNS = [
      'snapshot_id', 'brand', 'power_kw', 'poles', 'frequency_hz', 'designation_from',
      'efficiency_from', 'designation_to', 'efficiency_to', 'source_ref_id',
    ];
    const correlationRows = list('vendor_correlations').map((row) => ({
      snapshot_id: snapshotId,
      brand: row.brand,
      power_kw: row.power_kw,
      poles: row.poles,
      frequency_hz: row.frequency_hz,
      designation_from: row.designation_from,
      efficiency_from: row.efficiency_from,
      designation_to: row.designation_to,
      efficiency_to: row.efficiency_to,
      source_ref_id: refId(row),
    }));
    await insertChunks(correlationRows, CORRELATION_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_vendor_correlation ${tx(chunk, ...CORRELATION_COLUMNS)}`;
      return [];
    });

    const IEC_COLUMNS = ['snapshot_id', 'efficiency_class', 'poles', 'frequency_hz', 'power_kw', 'min_efficiency', 'standard_ref', 'source_ref_id'];
    const iecRows = list('iec_thresholds').map((row) => ({
      snapshot_id: snapshotId,
      efficiency_class: row.efficiency_class,
      poles: row.poles,
      frequency_hz: row.frequency_hz,
      power_kw: row.power_kw,
      min_efficiency: row.min_efficiency,
      standard_ref: row.standard_ref,
      source_ref_id: refId(row),
    }));
    await insertChunks(iecRows, IEC_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_iec_threshold ${tx(chunk, ...IEC_COLUMNS)}`;
      return [];
    });

    const VSD_COLUMNS = ['snapshot_id', 'efficiency_class', 'speed_min_rpm', 'speed_max_rpm', 'power_kw', 'min_efficiency', 'standard_ref', 'source_ref_id'];
    const vsdRows = list('iec_vsd_thresholds').map((row) => ({
      snapshot_id: snapshotId,
      efficiency_class: row.efficiency_class,
      speed_min_rpm: row.speed_min_rpm,
      speed_max_rpm: row.speed_max_rpm,
      power_kw: row.power_kw,
      min_efficiency: row.min_efficiency,
      standard_ref: row.standard_ref,
      source_ref_id: refId(row),
    }));
    await insertChunks(vsdRows, VSD_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_iec_vsd_threshold ${tx(chunk, ...VSD_COLUMNS)}`;
      return [];
    });

    const VALIDATION_COLUMNS = [
      'snapshot_id', 'model_id', 'operating_point_id', 'severity', 'rule_code',
      'message', 'observed', 'expected', 'restriction', 'source_ref_id',
    ];
    const validationRows = list('validation_issues').map((row) => ({
      snapshot_id: snapshotId,
      model_id: modelId(row.model_key as string),
      operating_point_id: pointId(row.point_origin as string),
      severity: row.severity,
      rule_code: row.rule_code,
      message: row.message,
      observed: row.observed,
      expected: row.expected,
      restriction: row.restriction,
      source_ref_id: refId(row),
    }));
    await insertChunks(validationRows, VALIDATION_COLUMNS, async (chunk) => {
      await tx`insert into configurator.motor_validation_issue ${tx(chunk, ...VALIDATION_COLUMNS)}`;
      return [];
    });

    // Journal du lot : anomalies de pipeline, bloquantes ou non.
    const ISSUE_COLUMNS = ['batch_id', 'severity', 'issue_code', 'message', 'context', 'activation_blocking'];
    const issueRows = anomalies.map((issue) => ({
      batch_id: batchId,
      severity: issue.severity,
      issue_code: issue.issue_code,
      message: issue.message,
      context: issue.context ?? {},
      activation_blocking: issue.activation_blocking,
    }));
    await insertChunks(issueRows, ISSUE_COLUMNS, async (chunk) => {
      // Postgres.js doit recevoir un vrai document JSON. JSON.stringify(...)
      // est une valeur scalaire JS et peut donc devenir une chaine JSONB.
      await tx`
        insert into configurator.import_issue (
          batch_id,
          severity,
          issue_code,
          message,
          context,
          activation_blocking
        )
        select
          issue.batch_id,
          issue.severity,
          issue.issue_code,
          issue.message,
          issue.context,
          issue.activation_blocking
        from jsonb_to_recordset(${tx.json(chunk)}) as issue(
          batch_id uuid,
          severity text,
          issue_code text,
          message text,
          context jsonb,
          activation_blocking boolean
        )
      `;
      return [];
    });

    const blocking = issueRows.filter((issue) => issue.activation_blocking).length;
    if (blocking > 0) throw new Error(`${blocking} anomalies bloquantes : chargement annule.`);

    await tx`
      update configurator.import_batch
      set status = 'ready', counters = ${tx.json(counters)},
          analyzed_by = ${ACTOR_ID}, analysis_completed_at = now()
      where id = ${batchId}
    `;
    await tx`
      update configurator.catalog_snapshot
      set status = 'ready', counters = ${tx.json(counters)},
          activation_gate_status = 'passed', activation_gate_checked_by = ${ACTOR_ID},
          activation_gate_checked_at = now()
      where id = ${snapshotId}
    `;

    return { idempotent: false, snapshotId, batchId, counters };
  });

  if ((result as Row).idempotent) {
    const existing = (result as Row).existing as Row;
    console.log('Lot deja charge, aucune ecriture.');
    console.log(`  empreinte  : ${fingerprint}`);
    console.log(`  lot        : ${existing.id} (${existing.status})`);
    console.log(`  snapshot   : ${existing.candidate_snapshot_id} (${existing.snapshot_status}, actif=${existing.is_active})`);
    return;
  }

  console.log('Chargement termine, snapshot non active.');
  console.log(`  empreinte  : ${fingerprint}`);
  console.log(`  snapshot   : ${(result as Row).snapshotId}`);
  console.log(`  lot        : ${(result as Row).batchId}`);
  console.table((result as Row).counters);
}

// ---------------------------------------------------------------------------
// Mode activate
// ---------------------------------------------------------------------------
async function activate(): Promise<void> {
  if (!SNAPSHOT_ARG) throw new Error('--snapshot=<uuid> requis.');
  if (!NOTE.trim()) throw new Error('--note="..." requis.');

  const [candidate] = await sql`
    select s.id, s.status, s.counters, s.activation_gate_status,
           (select count(*) from configurator.catalog_snapshot a
             where a.domain = s.domain and a.is_active) as actifs_avant,
           (select a.id from configurator.catalog_snapshot a
             where a.domain = s.domain and a.is_active
             order by a.activated_at desc nulls last
             limit 1) as previous_active_id,
           (select a.counters from configurator.catalog_snapshot a
             where a.domain = s.domain and a.is_active
             order by a.activated_at desc nulls last
             limit 1) as previous_counters
    from configurator.catalog_snapshot s
    where s.id = ${SNAPSHOT_ARG}
  `;
  if (!candidate) throw new Error('Snapshot introuvable.');

  // Empreinte du diff : contenu, jamais identifiants, donc reproductible.
  const diff = {
    domain: 'motor',
    previous_active: candidate.previous_active_id ?? null,
    previous_counters: candidate.previous_counters ?? {},
    candidate_counters: candidate.counters,
    lot_fingerprint_sha256: (readJson(MANIFEST_PATH) as Row).fingerprint_sha256,
  };
  const diffSha = await sha256Hex(stableStringify(diff));
  Deno.writeTextFileSync(DIFF_PATH, `${JSON.stringify({ ...diff, diff_sha256: diffSha }, null, 2)}\n`);

  const activated = await begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: ACTOR_ID, role: 'authenticated' })}, true)`;
    const [row] = await tx`select configurator.activate_snapshot(${SNAPSHOT_ARG}, ${NOTE}, ${diffSha}) as id`;
    return row;
  });

  console.log('Activation effectuee via configurator.activate_snapshot.');
  console.log(`  snapshot        : ${(activated as Row).id}`);
  console.log(`  actifs avant    : ${candidate.actifs_avant}`);
  console.log(`  empreinte diff  : ${diffSha}`);
  console.log(`  diff versionne  : ${DIFF_PATH}`);
}

try {
  if (MODE === 'load') await load();
  else if (MODE === 'activate') await activate();
  else throw new Error(`Mode inconnu : ${MODE}`);
} catch (error) {
  console.error('ECHEC :', redact(error));
  const detail = (error as { detail?: string; constraint_name?: string; table_name?: string });
  if (detail.constraint_name) console.error('  contrainte :', detail.constraint_name);
  if (detail.table_name) console.error('  table      :', detail.table_name);
  if (detail.detail) console.error('  detail     :', redact(detail.detail));
  Deno.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
