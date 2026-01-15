import { DEFAULT_MEGA_FAMILIES, DEFAULT_SERVICES, DEFAULT_ENTITY_TYPES, DEFAULT_STATUSES } from '../types';

const FAMILIES_KEY = 'cir_cockpit_families_v1';
const SERVICES_KEY = 'cir_cockpit_services_v1';
const ENTITIES_KEY = 'cir_cockpit_entities_v1';
const STATUSES_KEY = 'cir_cockpit_statuses_v1';

// --- FAMILIES ---
export const getStoredFamilies = (): string[] => {
  const data = localStorage.getItem(FAMILIES_KEY);
  return data ? JSON.parse(data) : DEFAULT_MEGA_FAMILIES;
};
export const saveStoredFamilies = (families: string[]) => {
  localStorage.setItem(FAMILIES_KEY, JSON.stringify(families));
};

// --- SERVICES ---
export const getStoredServices = (): string[] => {
  const data = localStorage.getItem(SERVICES_KEY);
  return data ? JSON.parse(data) : DEFAULT_SERVICES;
};
export const saveStoredServices = (services: string[]) => {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
};

// --- ENTITY TYPES (Client, Prospect...) ---
export const getStoredEntities = (): string[] => {
  const data = localStorage.getItem(ENTITIES_KEY);
  return data ? JSON.parse(data) : DEFAULT_ENTITY_TYPES;
};
export const saveStoredEntities = (entities: string[]) => {
  localStorage.setItem(ENTITIES_KEY, JSON.stringify(entities));
};

// --- STATUSES (A traiter, Clos...) ---
export const getStoredStatuses = (): string[] => {
  const data = localStorage.getItem(STATUSES_KEY);
  return data ? JSON.parse(data) : DEFAULT_STATUSES;
};
export const saveStoredStatuses = (statuses: string[]) => {
  localStorage.setItem(STATUSES_KEY, JSON.stringify(statuses));
};